import { addressRepository } from '../repositories/address.repository';

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseAddressBody = (body: Record<string, unknown>) => {
  const nested =
    typeof body.shippingAddress === 'object' && body.shippingAddress !== null
      ? (body.shippingAddress as Record<string, unknown>)
      : {};

  const line1 =
    normalizeString(nested.line1) ||
    normalizeString(nested.addressLine1) ||
    normalizeString(body.addressLine1) ||
    normalizeString(body.shippingAddressLine1);

  const district =
    normalizeString(nested.district) ||
    normalizeString(body.district) ||
    normalizeString(body.shippingDistrict);

  const province =
    normalizeString(nested.province) ||
    normalizeString(body.province) ||
    normalizeString(body.shippingProvince);

  return {
    recipientName: normalizeString(body.recipientName),
    recipientPhone: normalizeString(body.recipientPhone),
    label: normalizeOptionalString(body.label),
    addressLine1: line1,
    addressLine2:
      normalizeOptionalString(nested.line2) ??
      normalizeOptionalString(nested.addressLine2) ??
      normalizeOptionalString(body.addressLine2) ??
      normalizeOptionalString(body.shippingAddressLine2),
    ward:
      normalizeOptionalString(nested.ward) ??
      normalizeOptionalString(body.ward) ??
      normalizeOptionalString(body.shippingWard),
    district,
    province,
    postalCode:
      normalizeOptionalString(nested.postalCode) ??
      normalizeOptionalString(body.postalCode) ??
      normalizeOptionalString(body.shippingPostalCode),
    country:
      normalizeOptionalString(nested.country) ??
      normalizeOptionalString(body.country) ??
      normalizeOptionalString(body.shippingCountry) ??
      'VN',
    isDefault: body.isDefault === true || body.is_default === true,
  };
};

const serializeAddress = (row: Awaited<ReturnType<typeof addressRepository.findByIdForUser>>) => {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    ward: row.ward,
    district: row.district,
    province: row.province,
    postalCode: row.postal_code,
    country: row.country,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const addressService = {
  async list(userId: number) {
    const rows = await addressRepository.listByUser(userId);
    return rows.map((row) => serializeAddress(row)!);
  },

  async create(userId: number, body: Record<string, unknown>) {
    const parsed = parseAddressBody(body);
    if (!parsed.recipientName) throw new Error('MISSING_RECIPIENTNAME');
    if (!parsed.recipientPhone) throw new Error('MISSING_RECIPIENTPHONE');
    if (!parsed.addressLine1) throw new Error('MISSING_ADDRESS_LINE1');
    if (!parsed.district) throw new Error('MISSING_DISTRICT');
    if (!parsed.province) throw new Error('MISSING_PROVINCE');

    const row = await addressRepository.create({
      userId,
      ...parsed,
    });
    return serializeAddress(row);
  },

  async update(userId: number, addressId: number, body: Record<string, unknown>) {
    const parsed = parseAddressBody(body);
    const row = await addressRepository.update(addressId, userId, {
      userId,
      label: parsed.label !== null ? parsed.label : undefined,
      recipientName: parsed.recipientName || undefined,
      recipientPhone: parsed.recipientPhone || undefined,
      addressLine1: parsed.addressLine1 || undefined,
      addressLine2: parsed.addressLine2,
      ward: parsed.ward,
      district: parsed.district || undefined,
      province: parsed.province || undefined,
      postalCode: parsed.postalCode,
      country: parsed.country ?? undefined,
      isDefault: body.isDefault === true || body.is_default === true ? true : body.isDefault === false ? false : undefined,
    });
    return serializeAddress(row);
  },

  async remove(userId: number, addressId: number) {
    await addressRepository.remove(addressId, userId);
    return { id: addressId };
  },

  async saveFromCheckout(userId: number, body: Record<string, unknown>) {
    const count = await addressRepository.countByUser(userId);
    const saveAddress = body.saveAddress !== false && (body.saveAddress === true || count === 0);
    if (!saveAddress) return null;

    const parsed = parseAddressBody(body);
    if (!parsed.recipientName || !parsed.recipientPhone || !parsed.addressLine1) return null;
    if (!parsed.district || !parsed.province) return null;

    const duplicate = await addressRepository.findDuplicate({
      userId,
      ...parsed,
    });
    if (duplicate) {
      if (count === 0 && !duplicate.is_default) {
        const updated = await addressRepository.update(duplicate.id, userId, {
          userId,
          isDefault: true,
        });
        return serializeAddress(updated);
      }
      return serializeAddress(duplicate);
    }

    const row = await addressRepository.create({
      userId,
      ...parsed,
      label: parsed.label ?? (count === 0 ? 'Địa chỉ mặc định' : 'Địa chỉ giao hàng'),
      isDefault: count === 0,
    });
    return serializeAddress(row);
  },
};
