export interface UserAddress {
  id: number
  label: string | null
  recipientName: string
  recipientPhone: string
  addressLine1: string
  addressLine2: string | null
  ward: string | null
  district: string
  province: string
  postalCode: string | null
  country: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface AddressFormInput {
  label: string
  recipientName: string
  recipientPhone: string
  addressLine1: string
  addressLine2: string
  ward: string
  district: string
  province: string
  postalCode: string
  isDefault: boolean
}

export const emptyAddressForm = (): AddressFormInput => ({
  label: '',
  recipientName: '',
  recipientPhone: '',
  addressLine1: '',
  addressLine2: '',
  ward: '',
  district: '',
  province: '',
  postalCode: '',
  isDefault: false,
})

export const addressToForm = (address: UserAddress): AddressFormInput => ({
  label: address.label ?? '',
  recipientName: address.recipientName,
  recipientPhone: address.recipientPhone,
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2 ?? '',
  ward: address.ward ?? '',
  district: address.district,
  province: address.province,
  postalCode: address.postalCode ?? '',
  isDefault: address.isDefault,
})

export const formatAddressLine = (address: UserAddress) => {
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.ward,
    address.district,
    address.province,
  ].filter(Boolean)
  return parts.join(', ')
}
