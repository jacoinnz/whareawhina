'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Client } from '@prisma/client'

export type NewClientFields = {
  name: string
  contactName: string
  email: string
  phone: string
  address: string
}

type Props = {
  clients: Client[]
  selectedClientId: string
  onClientIdChange: (id: string) => void
  newClient: NewClientFields | null
  onNewClientChange: (fields: NewClientFields | null) => void
}

export function ClientSelector({
  clients,
  selectedClientId,
  onClientIdChange,
  newClient,
  onNewClientChange,
}: Props) {
  const [mode, setMode] = useState<'existing' | 'new'>(
    selectedClientId ? 'existing' : 'new'
  )

  function startNew() {
    setMode('new')
    onClientIdChange('')
    onNewClientChange({ name: '', contactName: '', email: '', phone: '', address: '' })
  }

  function selectExisting(id: string | null) {
    setMode('existing')
    onClientIdChange(id ?? '')
    onNewClientChange(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label>Client</Label>
        {mode === 'existing' && (
          <button type="button" onClick={startNew} className="text-xs text-blue-600 hover:underline">
            + New client
          </button>
        )}
      </div>

      {mode === 'existing' ? (
        <Select value={selectedClientId} onValueChange={selectExisting}>
          <SelectTrigger>
            <SelectValue placeholder="Select a client…" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} — {c.contactName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="border rounded-lg p-4 space-y-3 bg-blue-50">
          <p className="text-sm font-medium text-blue-700">New client</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Company name *</Label>
              <Input
                value={newClient?.name ?? ''}
                onChange={(e) => onNewClientChange({ ...newClient!, name: e.target.value })}
                placeholder="Whareawhina Ltd"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact name *</Label>
              <Input
                value={newClient?.contactName ?? ''}
                onChange={(e) => onNewClientChange({ ...newClient!, contactName: e.target.value })}
                placeholder="Jane Smith"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={newClient?.email ?? ''}
                onChange={(e) => onNewClientChange({ ...newClient!, email: e.target.value })}
                placeholder="jane@example.co.nz"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                value={newClient?.phone ?? ''}
                onChange={(e) => onNewClientChange({ ...newClient!, phone: e.target.value })}
                placeholder="09 123 4567"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Address</Label>
              <Input
                value={newClient?.address ?? ''}
                onChange={(e) => onNewClientChange({ ...newClient!, address: e.target.value })}
                placeholder="123 Main St, Auckland"
              />
            </div>
          </div>
          {clients.length > 0 && (
            <button
              type="button"
              onClick={() => { setMode('existing'); onNewClientChange(null) }}
              className="text-xs text-blue-600 hover:underline"
            >
              ← Select existing client instead
            </button>
          )}
        </div>
      )}
    </div>
  )
}
