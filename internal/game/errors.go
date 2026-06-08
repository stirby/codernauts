package game

import "fmt"

type Error struct {
	Code    string
	Message string
	Details map[string]any
}

func (e *Error) Error() string {
	return e.Message
}

func NewError(code, message string, details map[string]any) *Error {
	if details == nil {
		details = map[string]any{}
	}
	return &Error{Code: code, Message: message, Details: details}
}

func notFound(resource, id string) *Error {
	return NewError("not_found", fmt.Sprintf("%s not found.", resource), map[string]any{
		"id": id,
	})
}

func insufficientResources(cost Cost, ore int) *Error {
	return NewError("insufficient_resources", "Not enough resources.", map[string]any{
		"required_ore":  cost.Ore,
		"available_ore": ore,
	})
}

func energyCapacityExceeded(requiredEnergy, usedEnergy, maxEnergy int) *Error {
	return NewError("energy_capacity_exceeded", "Not enough energy capacity.", map[string]any{
		"required_energy":  requiredEnergy,
		"used_energy":      usedEnergy,
		"max_energy":       maxEnergy,
		"available_energy": maxEnergy - usedEnergy,
	})
}
