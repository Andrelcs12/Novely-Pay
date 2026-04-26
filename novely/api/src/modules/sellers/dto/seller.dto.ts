// src/modules/sellers/dto/seller.dto.ts

// ── Criar seller ─────────────────────────────────────────────
export interface CreateSellerDto {
  name: string;
  email: string;
  cpfCnpj: string;           // somente números
  mobilePhone: string;       // somente números
  companyType?: 'MEI' | 'LIMITED' | 'INDIVIDUAL' | 'ASSOCIATION';
  // endereço (obrigatório para KYC PJ)
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;         // bairro
  postalCode?: string;
  city?: string;
  state?: string;
}

// ── Cadastrar conta bancária ──────────────────────────────────
export interface CreateBankAccountDto {
  bank: string;              // código do banco ex: "033" (Santander)
  accountName: string;       // nome do titular
  ownerName: string;
  cpfCnpj: string;
  agency: string;
  agencyDigit?: string;
  account: string;
  accountDigit: string;
  bankAccountType: 'CHECKING' | 'SAVINGS'; // CORRENTE ou POUPANÇA
}

// ── Enviar documento KYC ──────────────────────────────────────
export interface SendKycDocumentDto {
  type:
    | 'IDENTIFICATION'       // RG ou CNH frente
    | 'IDENTIFICATION_VERSE' // RG verso
    | 'SELFIE'               // selfie com documento
    | 'RESIDENCE_PROOF'      // comprovante de residência
    | 'SOCIAL_CONTRACT'      // contrato social (PJ)
    | 'CUSTOM';
  documentFile: string;      // base64 do arquivo
  documentFileExtension: 'jpg' | 'jpeg' | 'png' | 'pdf';
}