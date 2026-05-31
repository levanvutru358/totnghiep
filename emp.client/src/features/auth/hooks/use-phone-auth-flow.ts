import { useMemo, useState } from 'react'

const isValidPhone = (value: string) => /^\d{9,11}$/.test(value.replace(/\s+/g, ''))

export function usePhoneAuthFlow() {
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)

  const canContinue = useMemo(() => agreed && isValidPhone(phone), [agreed, phone])

  return {
    phone,
    setPhone,
    agreed,
    setAgreed,
    canContinue,
  }
}

