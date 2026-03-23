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
  custoTotalPassivo: number
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

  // Cálculo do Déficit Total Atual
  const totalDeficit = Math.max(0, areaReservaLegal - rvAtual)
  const deficit2008 = Math.max(0, areaReservaLegal - rv2008)

  // Compensação: o que era deficit em 2008 e ainda é deficit hoje
  const compensacao = Math.min(totalDeficit, deficit2008)
  const valorCompensacao = valorRemanescenteVegetacao * 1.5 * compensacao

  // Recomposição: o resto do deficit atual (o que foi desmatado após 2008)
  const recomposicao = totalDeficit - compensacao

  let situacao2008 = ""
  if (compensacao > 0) {
    situacao2008 = `Déficit remanescente de 2008: necessita compensar ${compensacao.toFixed(2)} ha.`
  } else if (rv2008 < areaReservaLegal) {
    situacao2008 = "Possuía déficit em 2008, mas está regularizado atualmente."
  } else {
    situacao2008 = "Em 2008 já possuía o mínimo exigido. Não há compensação."
  }

  let situacaoAtual = ""
  if (totalDeficit <= 0) {
    situacaoAtual = "Atualmente possui o mínimo exigido. Não há passivo ambiental."
  } else if (recomposicao > 0) {
    situacaoAtual = `Déficit atual: necessita recompor ${recomposicao.toFixed(2)} ha.`
  } else {
    situacaoAtual = "Déficit atual pode ser totalmente compensado."
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
  const custoTotalPassivo = custoRecomposicaoTotal + valorCompensacao

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
    custoTotalPassivo,
    mudancas,
    distribuicaoFinal: usoFinal,
  }
}
