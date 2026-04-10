import type { WorkflowActionCardState, WorkflowActionKey } from '../types'
import { WorkflowActionCard } from './WorkflowActionCard'

export function WorkflowActionLane({
  cards,
  activeKey,
  onSelect,
}: {
  cards: WorkflowActionCardState[]
  activeKey: WorkflowActionKey | null
  onSelect: (key: WorkflowActionKey) => void
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <WorkflowActionCard
          key={card.key}
          card={card}
          active={activeKey === card.key}
          onClick={() => onSelect(card.key)}
        />
      ))}
    </div>
  )
}
