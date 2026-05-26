'use server';

import {
  progressOrderExecution as progressOrderExecutionImpl,
  signContractAction as signContractActionImpl,
  uploadOrderDocument as uploadOrderDocumentImpl,
  uploadOrderDocumentAction as uploadOrderDocumentActionImpl,
} from './order-lifecycle';
import {
  advanceOrderStageAction as advanceOrderStageActionImpl,
  approveActualOrderLinesGateAction as approveActualOrderLinesGateActionImpl,
  approveDeliveryNoteAction as approveDeliveryNoteActionImpl,
  approveDispatchGateAction as approveDispatchGateActionImpl,
  approveFinalInvoiceGateAction as approveFinalInvoiceGateActionImpl,
  approveFirstDocumentGateAction as approveFirstDocumentGateActionImpl,
  approveLogisticsDocsGateAction as approveLogisticsDocsGateActionImpl,
  approvePackingListGateAction as approvePackingListGateActionImpl,
  approvePackingOverridesAction as approvePackingOverridesActionImpl,
  closeOrderAction as closeOrderActionImpl,
  createShipmentDraftGateAction as createShipmentDraftGateActionImpl,
  ensureActualOrderLinesAction as ensureActualOrderLinesActionImpl,
  prepareFinalInvoiceGateAction as prepareFinalInvoiceGateActionImpl,
  prepareFirstDocumentGateAction as prepareFirstDocumentGateActionImpl,
  prepareLogisticsDocsGateAction as prepareLogisticsDocsGateActionImpl,
  preparePackingListGateAction as preparePackingListGateActionImpl,
  previewFinalInvoiceGateAction as previewFinalInvoiceGateActionImpl,
  previewFirstDocumentGateAction as previewFirstDocumentGateActionImpl,
  previewLogisticsDocsGateAction as previewLogisticsDocsGateActionImpl,
  previewPackingListGateAction as previewPackingListGateActionImpl,
  savePackingOverridesAction as savePackingOverridesActionImpl,
  saveProcessingCheckAction as saveProcessingCheckActionImpl,
} from './order-stage-gates';
import {
  approveDeliveryNoteAction as approveDeliveryNoteDocumentActionImpl,
  approveFinalInvoiceAction as approveFinalInvoiceActionImpl,
  prepareDeliveryNoteAction as prepareDeliveryNoteActionImpl,
  prepareFinalInvoiceAction as prepareFinalInvoiceActionImpl,
  sendOrderDocumentLinkAction as sendOrderDocumentLinkActionImpl,
  sendOrderDocumentViaWhatsApp as sendOrderDocumentViaWhatsAppImpl,
} from './order-documents';
import {
  addManualActualOrderLineAction as addManualActualOrderLineActionImpl,
  approveFreightRateRequestAction as approveFreightRateRequestActionImpl,
  approvePackingSheetAction as approvePackingSheetActionImpl,
  confirmTradeRequirementSourceAction as confirmTradeRequirementSourceActionImpl,
  markQueueEventManuallyCompletedAction as markQueueEventManuallyCompletedActionImpl,
  prepareActualOrderLinesRobustAction as prepareActualOrderLinesRobustActionImpl,
  prepareFreightRateRequestAction as prepareFreightRateRequestActionImpl,
  preparePackingSheetAction as preparePackingSheetActionImpl,
  previewFreightRateRequestAction as previewFreightRateRequestActionImpl,
  previewPackingSheetAction as previewPackingSheetActionImpl,
  queueFinanceIntegrationEventAction as queueFinanceIntegrationEventActionImpl,
  queueFreightBookingEventAction as queueFreightBookingEventActionImpl,
  reconcileApprovedPdfSourceAction as reconcileApprovedPdfSourceActionImpl,
  removeActualOrderLineAction as removeActualOrderLineActionImpl,
  retryPendingQueueEventAction as retryPendingQueueEventActionImpl,
  saveOrderDiscountAction as saveOrderDiscountActionImpl,
  searchAndAttachTradeRequirementsAction as searchAndAttachTradeRequirementsActionImpl,
  updateActualOrderLineAction as updateActualOrderLineActionImpl,
} from './order-integrations';

export async function progressOrderExecution(...args: Parameters<typeof progressOrderExecutionImpl>) {
  return progressOrderExecutionImpl(...args);
}

export async function signContractAction(...args: Parameters<typeof signContractActionImpl>) {
  return signContractActionImpl(...args);
}

export async function uploadOrderDocument(...args: Parameters<typeof uploadOrderDocumentImpl>) {
  return uploadOrderDocumentImpl(...args);
}

export async function uploadOrderDocumentAction(...args: Parameters<typeof uploadOrderDocumentActionImpl>) {
  return uploadOrderDocumentActionImpl(...args);
}

export async function advanceOrderStageAction(...args: Parameters<typeof advanceOrderStageActionImpl>) {
  return advanceOrderStageActionImpl(...args);
}

export async function approveActualOrderLinesGateAction(...args: Parameters<typeof approveActualOrderLinesGateActionImpl>) {
  return approveActualOrderLinesGateActionImpl(...args);
}

export async function approveDeliveryNoteAction(...args: Parameters<typeof approveDeliveryNoteActionImpl>) {
  return approveDeliveryNoteActionImpl(...args);
}

export async function approveDispatchGateAction(...args: Parameters<typeof approveDispatchGateActionImpl>) {
  return approveDispatchGateActionImpl(...args);
}

export async function approveFinalInvoiceGateAction(...args: Parameters<typeof approveFinalInvoiceGateActionImpl>) {
  return approveFinalInvoiceGateActionImpl(...args);
}

export async function approveFirstDocumentGateAction(...args: Parameters<typeof approveFirstDocumentGateActionImpl>) {
  return approveFirstDocumentGateActionImpl(...args);
}

export async function approveLogisticsDocsGateAction(...args: Parameters<typeof approveLogisticsDocsGateActionImpl>) {
  return approveLogisticsDocsGateActionImpl(...args);
}

export async function approvePackingListGateAction(...args: Parameters<typeof approvePackingListGateActionImpl>) {
  return approvePackingListGateActionImpl(...args);
}

export async function approvePackingOverridesAction(...args: Parameters<typeof approvePackingOverridesActionImpl>) {
  return approvePackingOverridesActionImpl(...args);
}

export async function closeOrderAction(...args: Parameters<typeof closeOrderActionImpl>) {
  return closeOrderActionImpl(...args);
}

export async function createShipmentDraftGateAction(...args: Parameters<typeof createShipmentDraftGateActionImpl>) {
  return createShipmentDraftGateActionImpl(...args);
}

export async function ensureActualOrderLinesAction(...args: Parameters<typeof ensureActualOrderLinesActionImpl>) {
  return ensureActualOrderLinesActionImpl(...args);
}

export async function prepareFinalInvoiceGateAction(...args: Parameters<typeof prepareFinalInvoiceGateActionImpl>) {
  return prepareFinalInvoiceGateActionImpl(...args);
}

export async function prepareFirstDocumentGateAction(...args: Parameters<typeof prepareFirstDocumentGateActionImpl>) {
  return prepareFirstDocumentGateActionImpl(...args);
}

export async function prepareLogisticsDocsGateAction(...args: Parameters<typeof prepareLogisticsDocsGateActionImpl>) {
  return prepareLogisticsDocsGateActionImpl(...args);
}

export async function preparePackingListGateAction(...args: Parameters<typeof preparePackingListGateActionImpl>) {
  return preparePackingListGateActionImpl(...args);
}

export async function previewFinalInvoiceGateAction(...args: Parameters<typeof previewFinalInvoiceGateActionImpl>) {
  return previewFinalInvoiceGateActionImpl(...args);
}

export async function previewFirstDocumentGateAction(...args: Parameters<typeof previewFirstDocumentGateActionImpl>) {
  return previewFirstDocumentGateActionImpl(...args);
}

export async function previewLogisticsDocsGateAction(...args: Parameters<typeof previewLogisticsDocsGateActionImpl>) {
  return previewLogisticsDocsGateActionImpl(...args);
}

export async function previewPackingListGateAction(...args: Parameters<typeof previewPackingListGateActionImpl>) {
  return previewPackingListGateActionImpl(...args);
}

export async function savePackingOverridesAction(...args: Parameters<typeof savePackingOverridesActionImpl>) {
  return savePackingOverridesActionImpl(...args);
}

export async function saveProcessingCheckAction(...args: Parameters<typeof saveProcessingCheckActionImpl>) {
  return saveProcessingCheckActionImpl(...args);
}

export async function approveDeliveryNoteDocumentAction(...args: Parameters<typeof approveDeliveryNoteDocumentActionImpl>) {
  return approveDeliveryNoteDocumentActionImpl(...args);
}

export async function approveFinalInvoiceAction(...args: Parameters<typeof approveFinalInvoiceActionImpl>) {
  return approveFinalInvoiceActionImpl(...args);
}

export async function prepareDeliveryNoteAction(...args: Parameters<typeof prepareDeliveryNoteActionImpl>) {
  return prepareDeliveryNoteActionImpl(...args);
}

export async function prepareFinalInvoiceAction(...args: Parameters<typeof prepareFinalInvoiceActionImpl>) {
  return prepareFinalInvoiceActionImpl(...args);
}

export async function sendOrderDocumentLinkAction(...args: Parameters<typeof sendOrderDocumentLinkActionImpl>) {
  return sendOrderDocumentLinkActionImpl(...args);
}

export async function sendOrderDocumentViaWhatsApp(...args: Parameters<typeof sendOrderDocumentViaWhatsAppImpl>) {
  return sendOrderDocumentViaWhatsAppImpl(...args);
}

export async function addManualActualOrderLineAction(...args: Parameters<typeof addManualActualOrderLineActionImpl>) {
  return addManualActualOrderLineActionImpl(...args);
}

export async function approveFreightRateRequestAction(...args: Parameters<typeof approveFreightRateRequestActionImpl>) {
  return approveFreightRateRequestActionImpl(...args);
}

export async function approvePackingSheetAction(...args: Parameters<typeof approvePackingSheetActionImpl>) {
  return approvePackingSheetActionImpl(...args);
}

export async function confirmTradeRequirementSourceAction(...args: Parameters<typeof confirmTradeRequirementSourceActionImpl>) {
  return confirmTradeRequirementSourceActionImpl(...args);
}

export async function markQueueEventManuallyCompletedAction(...args: Parameters<typeof markQueueEventManuallyCompletedActionImpl>) {
  return markQueueEventManuallyCompletedActionImpl(...args);
}

export async function prepareActualOrderLinesRobustAction(...args: Parameters<typeof prepareActualOrderLinesRobustActionImpl>) {
  return prepareActualOrderLinesRobustActionImpl(...args);
}

export async function prepareFreightRateRequestAction(...args: Parameters<typeof prepareFreightRateRequestActionImpl>) {
  return prepareFreightRateRequestActionImpl(...args);
}

export async function preparePackingSheetAction(...args: Parameters<typeof preparePackingSheetActionImpl>) {
  return preparePackingSheetActionImpl(...args);
}

export async function previewFreightRateRequestAction(...args: Parameters<typeof previewFreightRateRequestActionImpl>) {
  return previewFreightRateRequestActionImpl(...args);
}

export async function previewPackingSheetAction(...args: Parameters<typeof previewPackingSheetActionImpl>) {
  return previewPackingSheetActionImpl(...args);
}

export async function queueFinanceIntegrationEventAction(...args: Parameters<typeof queueFinanceIntegrationEventActionImpl>) {
  return queueFinanceIntegrationEventActionImpl(...args);
}

export async function queueFreightBookingEventAction(...args: Parameters<typeof queueFreightBookingEventActionImpl>) {
  return queueFreightBookingEventActionImpl(...args);
}

export async function reconcileApprovedPdfSourceAction(...args: Parameters<typeof reconcileApprovedPdfSourceActionImpl>) {
  return reconcileApprovedPdfSourceActionImpl(...args);
}

export async function removeActualOrderLineAction(...args: Parameters<typeof removeActualOrderLineActionImpl>) {
  return removeActualOrderLineActionImpl(...args);
}

export async function retryPendingQueueEventAction(...args: Parameters<typeof retryPendingQueueEventActionImpl>) {
  return retryPendingQueueEventActionImpl(...args);
}

export async function saveOrderDiscountAction(...args: Parameters<typeof saveOrderDiscountActionImpl>) {
  return saveOrderDiscountActionImpl(...args);
}

export async function searchAndAttachTradeRequirementsAction(...args: Parameters<typeof searchAndAttachTradeRequirementsActionImpl>) {
  return searchAndAttachTradeRequirementsActionImpl(...args);
}

export async function updateActualOrderLineAction(...args: Parameters<typeof updateActualOrderLineActionImpl>) {
  return updateActualOrderLineActionImpl(...args);
}
