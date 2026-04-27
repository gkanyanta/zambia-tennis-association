import { Smartphone } from 'lucide-react'

export function MobileMoneyOnlyNotice({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 flex items-start gap-2 ${className}`}
    >
      <Smartphone className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-semibold">Mobile Money only</p>
        <p className="text-blue-800">
          Card payments are temporarily unavailable. Please pay with{' '}
          <strong>Airtel Money</strong> or <strong>MTN Mobile Money</strong>.
        </p>
      </div>
    </div>
  )
}
