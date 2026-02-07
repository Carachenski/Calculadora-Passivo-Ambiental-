// Ordem de prioridade para retirada de áreas na recomposição
const PRIORIDADE = [
  "Outros",
  "Pastagem de Médio Suporte",
  "Silvicultura",
  "Pastagem de Alto Suporte",
  "Agricultura de Médio Potencial",
  "Agricultura de Alto Potencial",
  "Culturas Permanentes",
]

// Classes de uso
export const CLASSES = [
  "Agricultura de Alto Potencial",
  "Agricultura de Médio Potencial",
  "Culturas Permanentes",
  "Pastagem de Alto Suporte",
  "Pastagem de Médio Suporte",
  "Silvicultura",
  "Remanescente de Vegetação",
  "Outros",
]

export interface ClasseUso {
  area: number
  valor: number
}

export interface DadosGerais {
  areaTotal: number
  rvRequerida: number
  rv2008: number
  numeroMatricula: string
}

export interface ResultadoCalculo {
  areaReservaLegal: number
  compensacao: number
  valorCompensacao: number
  recomposicao: number
  situacao2008: string
  situacaoAtual: string
  valorAntes: number
  valorDepois: number
  variacao: number
  valorRecomposicao: number
  custoRecompor: number
  custoRecomposicaoTotal: number
  mudancas: Record<string, number>
  distribuicaoFinal: Record<string, ClasseUso>
}

export function calcularReservaLegal(dadosGerais: DadosGerais, uso: Record<string, ClasseUso>): ResultadoCalculo {
  const { areaTotal, rvRequerida, rv2008 } = dadosGerais

  // Obter área atual de Remanescente de Vegetação
  const rvAtual = uso["Remanescente de Vegetação"]?.area || 0
  const valorRemanescenteVegetacao = uso["Remanescente de Vegetação"]?.valor || 0

  // Cálculo da área necessária de Reserva Legal
  const areaReservaLegal = areaTotal * (rvRequerida / 100)

  // Compensação (baseada em 2008)
  let compensacao = 0
  let valorCompensacao = 0
  let situacao2008 = ""

  if (rv2008 < areaReservaLegal) {
    compensacao = areaReservaLegal - rv2008
    valorCompensacao = valorRemanescenteVegetacao * 1.5 * compensacao
    situacao2008 = `Déficit em 2008: necessita compensar ${compensacao.toFixed(2)} ha.`
  } else {
    situacao2008 = "Em 2008 já possuía o mínimo exigido. Não há compensação."
  }

  // Recomposição (situação atual)
  let recomposicao = 0
  let situacaoAtual = ""

  if (rvAtual < areaReservaLegal) {
    recomposicao = areaReservaLegal - rvAtual
    // Se já há compensação, reduzir da recomposição
    if (compensacao > 0) {
      recomposicao = Math.max(0, recomposicao - compensacao)
    }
    situacaoAtual = `Déficit atual: necessita recompor ${recomposicao.toFixed(2)} ha.`
  } else {
    situacaoAtual = "Atualmente possui o mínimo exigido. Não há recomposição."
  }

  // Valor do imóvel antes da recomposição
  const valorAntes = Object.values(uso).reduce((total, dados) => total + dados.area * dados.valor, 0)

  // Criar cópia profunda do uso para redistribuição
  const usoFinal = JSON.parse(JSON.stringify(uso))

  // Redistribuição das áreas para recomposição
  let areaRestanteRecompor = recomposicao
  const mudancas: Record<string, number> = {}

  // Aplicar redistribuição seguindo ordem de prioridade
  for (const classe of PRIORIDADE) {
    if (areaRestanteRecompor <= 0) break

    const disponivel = usoFinal[classe]?.area || 0
    if (disponivel > 0) {
      const transferencia = Math.min(disponivel, areaRestanteRecompor)
      usoFinal[classe].area -= transferencia
      usoFinal["Remanescente de Vegetação"].area += transferencia
      mudancas[classe] = transferencia
      areaRestanteRecompor -= transferencia
    }
  }

  // Valor do imóvel após recomposição
  const valorDepois = Object.values(usoFinal).reduce((total, dados) => total + dados.area * dados.valor, 0)
  const variacao = valorDepois - valorAntes

  // Cálculos de recomposição conforme especificado
  const valorRecomposicao = valorAntes - valorDepois
  const custoRecompor = recomposicao * (1.5 * valorRemanescenteVegetacao)
  const custoRecomposicaoTotal = valorRecomposicao + custoRecompor

  return {
    areaReservaLegal,
    compensacao,
    valorCompensacao,
    recomposicao,
    situacao2008,
    situacaoAtual,
    valorAntes,
    valorDepois,
    variacao,
    valorRecomposicao,
    custoRecompor,
    custoRecomposicaoTotal,
    mudancas,
    distribuicaoFinal: usoFinal,
  }
}
