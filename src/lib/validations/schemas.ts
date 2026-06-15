import { z } from 'zod'

function cpfTemDigitosValidos(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calcularDigito = (base: string, pesoInicial: number) => {
    let soma = 0
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i)
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const digito1 = calcularDigito(cpf.slice(0, 9), 10)
  const digito2 = calcularDigito(cpf.slice(0, 10), 11)

  return digito1 === Number(cpf[9]) && digito2 === Number(cpf[10])
}

export const telefoneSchema = z
  .string()
  .regex(/^\d{10,15}$/, 'Telefone deve conter entre 10 e 15 digitos, somente numeros.')

export const cpfSchema = z
  .string()
  .nullable()
  .refine((valor) => {
    if (!valor) return true
    const digitos = valor.replace(/\D/g, '')
    return digitos.length === 11 && cpfTemDigitosValidos(digitos)
  }, 'CPF invalido.')

export const valorCompraSchema = z
  .number({ invalid_type_error: 'Informe um valor de compra valido.' })
  .positive('O valor da compra deve ser maior que zero.')
  .refine((valor) => Number(valor.toFixed(2)) === valor, 'O valor da compra deve ter no maximo 2 casas decimais.')

export const pinSchema = z
  .string()
  .regex(/^\d{4,8}$/, 'PIN deve ter entre 4 e 8 digitos numericos.')

export const mensagemSchema = z
  .string()
  .min(5, 'A mensagem deve ter no minimo 5 caracteres.')
  .max(1000, 'A mensagem deve ter no maximo 1000 caracteres.')

export const nomeSchema = z
  .string()
  .min(2, 'O nome deve ter no minimo 2 caracteres.')
  .max(100, 'O nome deve ter no maximo 100 caracteres.')
