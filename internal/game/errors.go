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

// insufficientResources reports every missing resource for a cost. The
// legacy required_ore and available_ore fields stay populated whenever ore is
// part of the cost so older clients keep working.
func insufficientResources(cost Cost, available Cost) *Error {
	required := map[string]any{}
	availableDetails := map[string]any{}
	for resource, amount := range cost.Map() {
		required[resource] = amount
		availableDetails[resource] = availableAmount(available, resource)
	}
	details := map[string]any{
		"required":  required,
		"available": availableDetails,
	}
	if cost.Ore > 0 {
		details["required_ore"] = cost.Ore
		details["available_ore"] = available.Ore
	}
	return NewError("insufficient_resources", "Not enough resources.", details)
}

func availableAmount(available Cost, resource string) int {
	switch resource {
	case ResourceOre:
		return available.Ore
	case ResourceIce:
		return available.Ice
	case ResourceGas:
		return available.Gas
	case ResourceCrystal:
		return available.Crystal
	default:
		return 0
	}
}

func energyCapacityExceeded(requiredEnergy, usedEnergy, maxEnergy int) *Error {
	return NewError("energy_capacity_exceeded", "Not enough energy capacity.", map[string]any{
		"required_energy":  requiredEnergy,
		"used_energy":      usedEnergy,
		"max_energy":       maxEnergy,
		"available_energy": maxEnergy - usedEnergy,
	})
}

func nodeNotClaimed(nodeID string, claimCost Cost) *Error {
	return NewError("node_not_claimed", "Node must be claimed before its sites can be worked.", map[string]any{
		"node_id":    nodeID,
		"claim_cost": claimCost.Map(),
	})
}

func nodeAlreadyClaimed(nodeID, claimedBy string) *Error {
	return NewError("node_already_claimed", "Node is already claimed.", map[string]any{
		"node_id":    nodeID,
		"claimed_by": claimedBy,
	})
}

func crusherLevelTooLow(resource string, requiredLevel, currentLevel int) *Error {
	return NewError("crusher_level_too_low", fmt.Sprintf("The crusher cannot process %s yet.", resource), map[string]any{
		"resource":               resource,
		"required_crusher_level": requiredLevel,
		"crusher_level":          currentLevel,
	})
}

func invalidResource(resource string) *Error {
	return NewError("invalid_resource", "Unknown resource.", map[string]any{
		"resource": resource,
	})
}

func invalidAmount(amount int) *Error {
	return NewError("invalid_amount", "Conversion amount must be a whole number of at least 1.", map[string]any{
		"amount": amount,
	})
}
