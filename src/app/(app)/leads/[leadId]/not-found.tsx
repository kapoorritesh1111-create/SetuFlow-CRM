import { EmptyState } from '@/components/ui/empty-state'
import { PRODUCT_ROUTES } from '@/lib/product-contract'

export default function NotFound() {
  return (
    <EmptyState
      title="Lead not found"
      description="The requested lead could not be loaded from the active workspace, or it may have been removed from this queue."
      actionHref={PRODUCT_ROUTES.app.leads}
      actionLabel="Return to leads"
    />
  )
}
