package aghos

// PreCheckActionStart performs the service start action pre-check.
//
// TODO(e.burkov):  Move to the ossvc package.
func PreCheckActionStart() (err error) {
	return preCheckActionStart()
}
