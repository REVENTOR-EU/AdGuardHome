package ossvc

import (
	"fmt"
	"time"

	"github.com/kardianos/service"
)

// ConfigureServiceOptions defines additional settings of the service
// configuration.  conf must not be nil.
func ConfigureServiceOptions(conf *service.Config, versionInfo string) {
	conf.Option["SvcInfo"] = fmt.Sprintf("%s %s", versionInfo, time.Now())

	configureOSOptions(conf)
}
