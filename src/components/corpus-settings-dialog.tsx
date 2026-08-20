'use client'

import type { Corpus, CorpusCustomEntity } from '@/db/schema'
import type { CorpusSettings } from '@/lib/corpus-settings'
import type { EntityDatatype } from '@/types/types'
import { EditIcon, FilterIcon, Loader2Icon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { addCorpusCustomEntity, deleteCorpusCustomEntity, getCorpusCustomEntities, renameCorpus, updateCorpusCustomEntity, updateCorpusSettings } from '@/actions/corpus/corpusActions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ENTITY_DATATYPE_GROUPS, ENTITY_DATATYPE_LABELS } from '@/lib/datatypes'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Label } from './ui/label'

type CorpusSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  corpus: Corpus
  onCorpusRenamed?: (newTitle: string) => void
}

export function CorpusSettingsDialog({ open, onOpenChange, corpus, onCorpusRenamed }: CorpusSettingsDialogProps) {
  const [corpusTitle, setCorpusTitle] = useState(corpus.title)
  const [settings, setSettings] = useState<CorpusSettings>(corpus.settings ?? {})
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [customEntities, setCustomEntities] = useState<CorpusCustomEntity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingEntity, setEditingEntity] = useState<CorpusCustomEntity | null>(null)
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterType, setFilterType] = useState<'entity' | 'relation' | undefined>(undefined)
  const [newEntity, setNewEntity] = useState({
    label: '',
    value: '',
    datatype: 'string' as EntityDatatype,
    customType: 'entity' as 'entity' | 'relation',
  })

  const loadCustomEntities = useCallback(async () => {
    try {
      setIsLoading(true)
      const entities = await getCorpusCustomEntities(corpus.id)
      setCustomEntities(entities)
    } catch {
      toast.error('Failed to load custom entities')
    } finally {
      setIsLoading(false)
    }
  }, [corpus.id])

  useEffect(() => {
    if (open) {
      loadCustomEntities()
      setCorpusTitle(corpus.title)
      setSettings(corpus.settings ?? {})
    }
  }, [open, corpus.title, corpus.settings, loadCustomEntities])

  const handleSaveCorpusTitle = async () => {
    if (!corpusTitle || !corpusTitle.trim() || corpusTitle === corpus.title) {
      return
    }

    try {
      setIsSaving(true)
      await renameCorpus(corpus.id, corpusTitle)
      onCorpusRenamed?.(corpusTitle)
      toast.success('Corpus renamed successfully')
    } catch {
      toast.error('Failed to rename corpus')
      setCorpusTitle(corpus.title)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleSetting = async (key: keyof CorpusSettings, checked: boolean) => {
    const previous = settings[key]
    setSettings(prev => ({ ...prev, [key]: checked }))
    try {
      setIsSavingSettings(true)
      await updateCorpusSettings(corpus.id, { [key]: checked })
      toast.success(checked ? 'Wikidata setting enabled' : 'Wikidata setting disabled')
    } catch {
      setSettings(prev => ({ ...prev, [key]: previous }))
      toast.error('Failed to update corpus settings')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleAddEntity = async () => {
    if (!newEntity.label.trim() || !newEntity.value.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await addCorpusCustomEntity(
        corpus.id,
        newEntity.label,
        newEntity.value,
        newEntity.datatype,
        newEntity.customType,
      )
      setNewEntity({
        label: '',
        value: '',
        datatype: 'string',
        customType: 'entity',
      })
      await loadCustomEntities()
      toast.success('Custom entity added successfully')
    } catch {
      toast.error('Failed to add custom entity')
    }
  }

  const handleUpdateEntity = async () => {
    if (!editingEntity) {
      return
    }

    try {
      await updateCorpusCustomEntity(
        editingEntity.id,
        editingEntity.label,
        editingEntity.value,
        editingEntity.datatype,
        editingEntity.customType,
      )
      setEditingEntity(null)
      await loadCustomEntities()
      toast.success('Custom entity updated successfully')
    } catch {
      toast.error('Failed to update custom entity')
    }
  }

  const handleDeleteEntity = async (id: string) => {
    try {
      await deleteCorpusCustomEntity(id)
      await loadCustomEntities()
      toast.success('Custom entity deleted successfully')
    } catch {
      toast.error('Failed to delete custom entity')
    }
  }

  // Filter entities based on the search keyword
  const filteredEntities = customEntities.filter((entity) => {
    const searchTerm = filterKeyword.toLowerCase()
    if (!searchTerm.trim() && !filterType) {
      return true // No filter applied, show all entities
    }
    // Check if the entity matches the search term or filter type
    if (!entity.label || !entity.value) {
      return false // Skip entities without label or value
    }
    const matchesKeyword = entity.label.toLowerCase().includes(searchTerm) || entity.value.toLowerCase().includes(searchTerm)
    const matchesType = !filterType || entity.customType === filterType
    return matchesKeyword && matchesType
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Corpus Settings</DialogTitle>
          <DialogDescription>
            Manage your corpus settings and custom entities.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="entities">Custom Entities</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="corpus-title">
                Corpus Name
              </Label>
              <div className="flex gap-2">
                <Input
                  id="corpus-title"
                  value={corpusTitle || ''}
                  onChange={e => setCorpusTitle(e.target.value)}
                  placeholder="Enter corpus name"
                />
                <Button
                  onClick={handleSaveCorpusTitle}
                  disabled={isSaving || !corpusTitle || !corpusTitle.trim() || corpusTitle === corpus.title}
                >
                  {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : <EditIcon className="size-4" />}
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium">Wikidata</h3>
              <div className="flex items-start justify-between gap-4 rounded-md border p-4">
                <div className="space-y-1">
                  <Label htmlFor="wikidata-constraint-warnings">
                    Check annotations against Wikidata constraints
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show constraint warnings on the analytics and document pages.
                  </p>
                </div>
                <Checkbox
                  id="wikidata-constraint-warnings"
                  checked={Boolean(settings.wikidataConstraintWarnings)}
                  disabled={isSavingSettings}
                  onCheckedChange={checked => handleToggleSetting('wikidataConstraintWarnings', Boolean(checked))}
                />
              </div>
              <div className="flex items-start justify-between gap-4 rounded-md border p-4">
                <div className="space-y-1">
                  <Label htmlFor="wikidata-predicate-filtering">
                    Filter entity and predicate suggestions by Wikidata constraints
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Restrict annotation suggestions to Wikidata-compatible items.
                  </p>
                </div>
                <Checkbox
                  id="wikidata-predicate-filtering"
                  checked={Boolean(settings.wikidataPredicateFiltering)}
                  disabled={isSavingSettings}
                  onCheckedChange={checked => handleToggleSetting('wikidataPredicateFiltering', Boolean(checked))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="entities" className="flex flex-1 flex-col space-y-4 overflow-hidden">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Add New Custom Entity</h3>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Input
                  placeholder="Label"
                  value={newEntity.label}
                  onChange={e => setNewEntity(prev => ({ ...prev, label: e.target.value }))}
                />
                <Input
                  placeholder="Value"
                  value={newEntity.value}
                  onChange={e => setNewEntity(prev => ({ ...prev, value: e.target.value }))}
                />
                <Select
                  value={newEntity.datatype}
                  onValueChange={(value: EntityDatatype) => setNewEntity(prev => ({ ...prev, datatype: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_DATATYPE_GROUPS.map(group => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.types.map(type => (
                          <SelectItem key={type} value={type}>
                            {ENTITY_DATATYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newEntity.customType}
                  onValueChange={(value: 'entity' | 'relation') => setNewEntity(prev => ({ ...prev, customType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entity">Entity</SelectItem>
                    <SelectItem value="relation">Relation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddEntity} className="w-fit">
                <PlusIcon className="mr-2 size-4" />
                Add Entity
              </Button>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-medium">Existing Custom Entities</h3>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Filter by type (Entity/Relation) dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FilterIcon />
                        {filterType ? filterType.charAt(0).toUpperCase() + filterType.slice(1) : 'All'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setFilterType('entity')}>Entity</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType('relation')}>Relation</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType(undefined)}>All</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* Search bar for filtering entities */}
                  <div className="relative">
                    <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Filter entities..."
                      value={filterKeyword}
                      onChange={e => setFilterKeyword(e.target.value)}
                      className="w-64 pl-8"
                    />
                  </div>
                </div>
              </div>
              {isLoading
                ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2Icon className="size-6 animate-spin" />
                    </div>
                  )
                : (
                    <div className="flex-1 overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Label</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Datatype</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEntities.length === 0
                            ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    {customEntities.length === 0
                                      ? 'No custom entities found. Add one above to get started.'
                                      : 'No entities match your filter.'}
                                  </TableCell>
                                </TableRow>
                              )
                            : (
                                filteredEntities.map(entity => (
                                  <TableRow key={entity.id}>
                                    <TableCell>
                                      {editingEntity?.id === entity.id
                                        ? (
                                            <Input
                                              value={editingEntity.label}
                                              onChange={e => setEditingEntity(prev => prev ? { ...prev, label: e.target.value } : null)}
                                            />
                                          )
                                        : (
                                            entity.label
                                          )}
                                    </TableCell>
                                    <TableCell>
                                      {editingEntity?.id === entity.id
                                        ? (
                                            <Input
                                              value={editingEntity.value}
                                              onChange={e => setEditingEntity(prev => prev ? { ...prev, value: e.target.value } : null)}
                                            />
                                          )
                                        : (
                                            entity.value
                                          )}
                                    </TableCell>
                                    <TableCell>
                                      {editingEntity?.id === entity.id
                                        ? (
                                            <Select
                                              value={editingEntity.customType}
                                              onValueChange={(value: 'entity' | 'relation') => setEditingEntity(prev => prev ? { ...prev, customType: value } : null)}
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="entity">Entity</SelectItem>
                                                <SelectItem value="relation">Relation</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          )
                                        : (
                                            entity.customType.charAt(0).toUpperCase() + entity.customType.slice(1)
                                          )}
                                    </TableCell>
                                    <TableCell>
                                      {editingEntity?.id === entity.id
                                        ? (
                                            <Select
                                              value={editingEntity.datatype}
                                              onValueChange={(value: EntityDatatype) => setEditingEntity(prev => prev ? { ...prev, datatype: value } : null)}
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {ENTITY_DATATYPE_GROUPS.map(group => (
                                                  <SelectGroup key={group.label}>
                                                    <SelectLabel>{group.label}</SelectLabel>
                                                    {group.types.map(type => (
                                                      <SelectItem key={type} value={type}>
                                                        {ENTITY_DATATYPE_LABELS[type]}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectGroup>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )
                                        : (
                                            ENTITY_DATATYPE_LABELS[entity.datatype]
                                          )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        {editingEntity?.id === entity.id
                                          ? (
                                              <>
                                                <Button size="sm" onClick={handleUpdateEntity}>
                                                  Save
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setEditingEntity(null)}>
                                                  Cancel
                                                </Button>
                                              </>
                                            )
                                          : (
                                              <>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => setEditingEntity(entity)}
                                                >
                                                  <EditIcon className="size-3" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="destructive"
                                                  onClick={() => handleDeleteEntity(entity.id)}
                                                >
                                                  <Trash2Icon className="size-3" />
                                                </Button>
                                              </>
                                            )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
