# V9 Data Schema (Fictional Demonstration)

Items: existing fields + `trackingMode` (quantity | serialized).
Loans: existing fields + `returnedQuantity` (0 for active/unreturned, quantity for completed legacy returns) and `unitIds` (`|` separated unique UNIT IDs for serialized loans).
Assets: `id,itemId,serial,status,location,assignedLoanId,notes`. Status = Serviceable/Damaged/Unserviceable/Lost/Issued to keep/Consumed. AssignedLoanId identifies which member's outstanding loan currently holds the unit.
Reconciliations: `id,at,itemId,expected,observed,difference,applied,reason,actor`. Serialized inventory reviews cannot auto-apply adjustments.

Generated unit IDs are distinct from inventory catalog item IDs (e.g. EQ-001). Individual serial number may be entered afterward, and is not used as the internal primary key.

This schema is only for a prototype and is **not** a CAP official property-control format or a security compliance determination.
