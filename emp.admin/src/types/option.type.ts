export interface Option {
  value: string | number
  label: string
  description?: string
  disabled?: boolean
  group?: string
}

export interface OptionGroup {
  label: string
  options: Option[]
}

export type Options = Option[] | OptionGroup[]