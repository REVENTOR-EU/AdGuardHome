package home

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"runtime"
	"strconv"
	"strings"
	"syscall"

	"github.com/AdguardTeam/AdGuardHome/internal/aghos"
	"github.com/AdguardTeam/AdGuardHome/internal/ossvc"
	"github.com/AdguardTeam/AdGuardHome/internal/version"
	"github.com/AdguardTeam/golibs/errors"
	"github.com/AdguardTeam/golibs/logutil/slogutil"
	"github.com/AdguardTeam/golibs/netutil/urlutil"
	"github.com/AdguardTeam/golibs/osutil"
	"github.com/AdguardTeam/golibs/osutil/executil"
	"github.com/kardianos/service"
)

// TODO(a.garipov): Consider moving the shell templates into actual files and
// using go:embed instead of using large string constants.

const (
	serviceName        = "AdGuardHome"
	serviceDisplayName = "AdGuard Home service"
	serviceDescription = "AdGuard Home: Network-level blocker"
)

// program represents the program that will be launched by as a service or a
// daemon.
type program struct {
	// TODO(e.burkov):  Remove this.
	ctx           context.Context
	clientBuildFS fs.FS
	signals       chan os.Signal
	done          chan struct{}
	opts          options
	baseLogger    *slog.Logger
	logger        *slog.Logger
	sigHdlr       *signalHandler
	workDir       string
	confPath      string
}

// type check
var _ service.Interface = (*program)(nil)

// Start implements the [service.Interface] interface for *program.
func (p *program) Start(_ service.Service) (err error) {
	// Start should not block.  Do the actual work async.
	args := p.opts
	args.runningAsService = true

	go run(p.ctx, p.baseLogger, args, p.clientBuildFS, p.done, p.sigHdlr, p.workDir, p.confPath)

	return nil
}

// Stop implements the [service.Interface] interface for *program.
func (p *program) Stop(_ service.Service) (err error) {
	p.logger.InfoContext(p.ctx, "stopping: waiting for cleanup")

	aghos.SendShutdownSignal(p.signals)

	// Wait for other goroutines to complete their job.
	<-p.done

	return nil
}

// Send SIGHUP to a process with PID taken from our .pid file.  If it doesn't
// exist, find our PID using 'ps' command.  baseLogger and l must not be nil.
func sendSigReload(ctx context.Context, baseLogger, l *slog.Logger) {
	if runtime.GOOS == "windows" {
		l.ErrorContext(ctx, "not implemented on windows")

		return
	}

	pidFile := fmt.Sprintf("/var/run/%s.pid", serviceName)
	var pid int
	data, err := os.ReadFile(pidFile)
	if errors.Is(err, os.ErrNotExist) {
		aghosLogger := baseLogger.With(slogutil.KeyPrefix, "aghos")
		if pid, err = aghos.PIDByCommand(ctx, aghosLogger, serviceName, os.Getpid()); err != nil {
			l.ErrorContext(ctx, "finding adguardhome process", slogutil.KeyError, err)

			return
		}
	} else if err != nil {
		l.ErrorContext(ctx, "reading", "pid_file", pidFile, slogutil.KeyError, err)

		return
	} else {
		parts := strings.SplitN(string(data), "\n", 2)
		if len(parts) == 0 {
			l.ErrorContext(ctx, "splitting", "pid_file", pidFile, slogutil.KeyError, "bad value")

			return
		}

		if pid, err = strconv.Atoi(strings.TrimSpace(parts[0])); err != nil {
			l.ErrorContext(ctx, "parsing", "pid_file", pidFile, slogutil.KeyError, err)

			return
		}
	}

	var proc *os.Process
	if proc, err = os.FindProcess(pid); err != nil {
		l.ErrorContext(ctx, "finding process for", "pid", pid, slogutil.KeyError, err)

		return
	}

	if err = proc.Signal(syscall.SIGHUP); err != nil {
		l.ErrorContext(ctx, "sending sighup to", "pid", pid, slogutil.KeyError, err)

		return
	}

	l.DebugContext(ctx, "sent sighup to", "pid", pid)
}

// restartService restarts the service.  It returns error if the service is not
// running.  l must not be nil.
func restartService(ctx context.Context, l *slog.Logger) (err error) {
	pwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("getting current directory: %w", err)
	}

	svcConfig := &service.Config{
		Name:             serviceName,
		DisplayName:      serviceDisplayName,
		Description:      serviceDescription,
		WorkingDirectory: pwd,
	}
	ossvc.ConfigureServiceOptions(svcConfig, version.Full())

	ossLogger := l.With(slogutil.KeyPrefix, "ossvc")
	mgr, err := ossvc.NewManager(ctx, &ossvc.ManagerConfig{
		Logger:             ossLogger,
		CommandConstructor: executil.SystemCommandConstructor{},
	})
	if err != nil {
		return fmt.Errorf("initializing service manager: %w", err)
	}

	action := &ossvc.ActionReload{ServiceConf: svcConfig}
	if err = mgr.Perform(ctx, action); err != nil {
		return fmt.Errorf("restarting service: %w", err)
	}

	return nil
}

// handleServiceControlAction one of the possible control actions:
//
//   - install:  Installs a service/daemon.
//   - uninstall:  Uninstalls it.
//   - status:  Prints the service status.
//   - start:  Starts the previously installed service.
//   - stop:  Stops the previously installed service.
//   - restart:  Restarts the previously installed service.
//   - run:  This is a special command that is not supposed to be used directly
//     it is specified when we register a service, and it indicates to the app
//     that it is being run as a service/daemon.
//
// TODO(e.burkov):  !! imp cognit
func handleServiceControlAction(
	ctx context.Context,
	baseLogger *slog.Logger,
	l *slog.Logger,
	opts options,
	clientBuildFS fs.FS,
	signals chan os.Signal,
	done chan struct{},
	sigHdlr *signalHandler,
	workDir string,
	confPath string,
) {
	action := opts.serviceControlAction
	l.InfoContext(ctx, version.Full())
	l.InfoContext(ctx, "control", "action", action)

	// TODO(e.burkov):  Add a new [ossvc.Action]?
	if action == "reload" {
		sendSigReload(ctx, baseLogger, l)

		return
	}

	pwd, err := os.Getwd()
	if err != nil {
		l.ErrorContext(ctx, "getting current directory", slogutil.KeyError, err)
		os.Exit(osutil.ExitCodeFailure)
	}

	runOpts := opts
	runOpts.serviceControlAction = "run"

	args := optsToArgs(runOpts)
	l.DebugContext(ctx, "using", "args", args)

	svcConfig := &service.Config{
		Name:             serviceName,
		DisplayName:      serviceDisplayName,
		Description:      serviceDescription,
		WorkingDirectory: pwd,
		Arguments:        args,
	}
	ossvc.ConfigureServiceOptions(svcConfig, version.Full())

	iface := &program{
		ctx:           ctx,
		clientBuildFS: clientBuildFS,
		signals:       signals,
		done:          done,
		opts:          runOpts,
		baseLogger:    l,
		logger:        l.With(slogutil.KeyPrefix, "service"),
		sigHdlr:       sigHdlr,
		workDir:       workDir,
		confPath:      confPath,
	}

	if action == "run" {
		var s service.Service
		s, err = service.New(iface, svcConfig)
		if err != nil {
			l.ErrorContext(ctx, "initializing service", slogutil.KeyError, err)
			os.Exit(osutil.ExitCodeFailure)
		}

		err = s.Run()
		if err != nil {
			l.ErrorContext(ctx, "running service", slogutil.KeyError, err)
			os.Exit(osutil.ExitCodeFailure)
		}

		return
	}

	ossLogger := baseLogger.With(slogutil.KeyPrefix, "ossvc")
	mgr, err := ossvc.NewManager(ctx, &ossvc.ManagerConfig{
		Logger:             ossLogger,
		CommandConstructor: executil.SystemCommandConstructor{},
	})
	if err != nil {
		l.ErrorContext(ctx, "initializing service manager", slogutil.KeyError, err)
		os.Exit(osutil.ExitCodeFailure)
	}

	err = handleServiceCommand(ctx, l, iface, mgr, svcConfig, action, workDir, confPath)
	if err != nil {
		l.ErrorContext(ctx, "handling command", slogutil.KeyError, err)
		os.Exit(osutil.ExitCodeFailure)
	}

	l.InfoContext(
		ctx,
		"action has been done successfully",
		"action", action,
		"system", service.ChosenSystem(),
	)
}

// handleServiceCommand handles service command.
func handleServiceCommand(
	ctx context.Context,
	l *slog.Logger,
	iface service.Interface,
	mgr ossvc.Manager,
	svcConfig *service.Config,
	action string,
	workDir string,
	confPath string,
) (err error) {
	var act ossvc.Action
	switch action {
	case "install":
		return handleServiceInstall(ctx, l, iface, mgr, svcConfig, workDir, confPath)
	case "status":
		var status ossvc.Status
		status, err = mgr.Status(ctx, ossvc.ServiceName(svcConfig.Name))
		if err != nil {
			return fmt.Errorf("getting service status: %w", err)
		}

		l.InfoContext(ctx, "service status", "status", status)

		return nil
	case "start":
		act = &ossvc.ActionStart{ServiceConf: svcConfig, Interface: iface}
	case "stop":
		act = &ossvc.ActionStop{ServiceConf: svcConfig, Interface: iface}
	case "restart":
		act = &ossvc.ActionReload{ServiceConf: svcConfig, Interface: iface}
	case "uninstall":
		act = &ossvc.ActionUninstall{ServiceConf: svcConfig, Interface: iface}
	default:
		return fmt.Errorf("executing action %q: %w", action, errors.ErrBadEnumValue)
	}

	if err = mgr.Perform(ctx, act); err != nil {
		return fmt.Errorf("executing action %q: %w", action, err)
	}

	return nil
}

func handleServiceInstall(
	ctx context.Context,
	l *slog.Logger,
	iface service.Interface,
	mgr ossvc.Manager,
	svcConfig *service.Config,
	workDir string,
	confPath string,
) (err error) {
	inst := &ossvc.ActionInstall{ServiceConf: svcConfig}
	if err = mgr.Perform(ctx, inst); err != nil {
		l.ErrorContext(ctx, "executing install", slogutil.KeyError, err)
		os.Exit(osutil.ExitCodeFailure)
	}

	start := &ossvc.ActionStart{ServiceConf: svcConfig, Interface: iface}
	if err = mgr.Perform(ctx, start); err != nil {
		l.ErrorContext(ctx, "starting", slogutil.KeyError, err)
		os.Exit(osutil.ExitCodeFailure)
	}
	l.InfoContext(ctx, "started")

	// TODO(e.burkov):  Move this into [program].
	if detectFirstRun(ctx, l, workDir, confPath) {
		slogutil.PrintLines(ctx, l, slog.LevelInfo, "", "Almost ready!\n"+
			"AdGuard Home is successfully installed and will automatically start on boot.\n"+
			"There are a few more things that must be configured before you can use it.\n"+
			"Click on the link below and follow the Installation Wizard steps to finish setup.\n"+
			"AdGuard Home is now available at the following addresses:")
		printHTTPAddresses(urlutil.SchemeHTTP, nil)
	}

	return nil
}
