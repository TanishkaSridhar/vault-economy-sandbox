import { SlidingTabs } from './SlidingTabs'

interface TabSwitchProps {
  tabs: string[]
  active: string
  onChange: (tab: string) => void
}

export function TabSwitch({ tabs, active, onChange }: TabSwitchProps) {
  return <SlidingTabs tabs={tabs} active={active} onChange={onChange} size="sm" />
}
