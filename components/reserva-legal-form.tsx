"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Leaf, Calculator, TrendingUp, AlertTriangle, RotateCcw, Download } from "lucide-react"
import {
  calcularReservaLegal,
  CLASSES,
  type DadosGerais,
  type ClasseUso,
  type ResultadoCalculo,
} from "@/lib/reserva-legal-calculator"

import jsPDF from "jspdf"

interface FormData {
  areaTotal: string
  rvRequerida: string
  rv2008: string
  numeroMatricula: string
  uso: Record<string, { area: string; valor: string }>
}

export function ReservaLegalForm() {
  const [formData, setFormData] = useState<FormData>({
    areaTotal: "",
    rvRequerida: "",
    rv2008: "",
    numeroMatricula: "",
    uso: CLASSES.reduce((acc, classe) => ({
      ...acc,
      [classe]: { area: "", valor: "" },
    }), {}),
  })

  const [results, setResults] = useState<ResultadoCalculo | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleInputChange = (field: keyof Omit<FormData, "uso">, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleClasseChange = (classe: string, field: "area" | "valor", value: string) => {
    setFormData((prev) => ({
      ...prev,
      uso: {
        ...prev.uso,
        [classe]: { ...prev.uso[classe], [field]: value },
      },
    }))
  }

  const validarFormulario = (): string[] => {
    const erros: string[] = []
    const areaTotal = parseFloat(formData.areaTotal.replace(",", ".")) || 0
    const rvRequerida = parseFloat(formData.rvRequerida.replace(",", ".")) || 0

    if (areaTotal <= 0) erros.push("Área total deve ser maior que zero")
    if (rvRequerida <= 0 || rvRequerida > 100) erros.push("RV Requerida deve estar entre 0 e 100%")

    const somaAreas = Object.values(formData.uso).reduce(
      (sum, dados) => sum + (parseFloat(dados.area.replace(",", ".")) || 0),
      0
    )

    if (Math.abs(somaAreas - areaTotal) > 0.01) {
      erros.push(
        `A soma das áreas das classes de uso (${somaAreas.toFixed(2)} ha) deve ser igual à área total do imóvel (${areaTotal} ha). Verifique os valores informados.`
      )
    }

    return erros
  }

  const calcular = async () => {
    const errosValidacao = validarFormulario()
    if (errosValidacao.length > 0) {
      setErrors(errosValidacao)
      setResults(null)
      return
    }

    setErrors([])
    setLoading(true)

    try {
      const dadosGerais: DadosGerais = {
        areaTotal: parseFloat(formData.areaTotal.replace(",", ".")) || 0,
        rvRequerida: parseFloat(formData.rvRequerida.replace(",", ".")) || 0,
        rv2008: parseFloat(formData.rv2008.replace(",", ".")) || 0,
        numeroMatricula: formData.numeroMatricula,
      }

      const usoNumerico: Record<string, ClasseUso> = Object.fromEntries(
        Object.entries(formData.uso).map(([classe, dados]) => [
          classe,
          {
            area: parseFloat(dados.area.replace(",", ".")) || 0,
            valor: parseFloat(dados.valor.replace(",", ".")) || 0,
          },
        ])
      )

      const resultado = calcularReservaLegal(dadosGerais, usoNumerico)
      setResults(resultado)
    } catch (error) {
      console.error("Erro no cálculo:", error)
      setErrors(["Erro ao realizar o cálculo. Tente novamente."])
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const limparFormulario = () => {
    setFormData({
      areaTotal: "",
      rvRequerida: "",
      rv2008: "",
      numeroMatricula: "",
      uso: CLASSES.reduce((acc, classe) => ({
        ...acc,
        [classe]: { area: "", valor: "" },
      }), {}),
    })
    setResults(null)
    setErrors([])
  }

  const exportarPDF = () => {
    if (!results) return

    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 20
    let yPosition = margin

    // Cabeçalho
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(16)
    pdf.text("CALCULADORA DE PASSIVO AMBIENTAL", pageWidth / 2, yPosition, { align: "center" })
    yPosition += 10
    pdf.setFontSize(12)
    pdf.text("Cálculo de compensação e recomposição de Reserva Legal", pageWidth / 2, yPosition, { align: "center" })
    yPosition += 20

    // Dados Gerais do Imóvel
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(14)
    pdf.text("DADOS GERAIS DO IMÓVEL", margin, yPosition)
    yPosition += 10

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.text(`Área Total: ${formData.areaTotal} ha`, margin, yPosition)
    pdf.text(`RV Requerida: ${formFormFieldToDisplay(formData.rvRequerida)}`, margin + 60, yPosition)
    yPosition += 6
    pdf.text(`Área RV em 2008: ${formFormFieldToDisplay(formData.rv2008)} ha`, margin, yPosition)
    pdf.text(`Matrícula: ${formData.numeroMatricula}`, margin + 60, yPosition)
    yPosition += 15

    // Resumo Passivo
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(14)
    pdf.text("RESUMO PASSIVO", margin, yPosition)
    yPosition += 10

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.text(`Área RL Necessária: ${results.areaReservaLegal.toFixed(2)} ha`, margin, yPosition)
    yPosition += 6
    pdf.text(`Área Compensação: ${results.compensacao.toFixed(2)} ha`, margin, yPosition)
    pdf.text(`Valor para Compensar: ${formatCurrency(results.valorCompensacao)}`, margin + 80, yPosition)
    yPosition += 6
    pdf.text(`Área Recomposição: ${results.recomposicao.toFixed(2)} ha`, margin, yPosition)
    pdf.text(`Valor Total da Recomposição: ${formatCurrency(results.custoRecomposicaoTotal)}`, margin + 80, yPosition)
    yPosition += 10

    pdf.setFont("helvetica", "bold")
    pdf.text(
      `PASSIVO TOTAL: ${formatCurrency(results.valorCompensacao + results.custoRecomposicaoTotal)}`,
      margin,
      yPosition,
    )
    yPosition += 20

    // Situação
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(14)
    pdf.text("SITUAÇÃO", margin, yPosition)
    yPosition += 10

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.text("Situação em 2008:", margin, yPosition)
    yPosition += 5
    const situacao2008Lines = pdf.splitTextToSize(results.situacao2008, pageWidth - 2 * margin)
    pdf.text(situacao2008Lines, margin, yPosition)
    yPosition += situacao2008Lines.length * 5 + 5

    pdf.text("Situação Atual:", margin, yPosition)
    yPosition += 5
    const situacaoAtualLines = pdf.splitTextToSize(results.situacaoAtual, pageWidth - 2 * margin)
    pdf.text(situacaoAtualLines, margin, yPosition)
    yPosition += situacaoAtualLines.length * 5 + 15

    // Mudanças de Área (se houver)
    if (Object.keys(results.mudancas).length > 0) {
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(14)
      pdf.text("MUDANÇAS DE ÁREA PARA RECOMPOSIÇÃO", margin, yPosition)
      yPosition += 10

      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(10)
      Object.entries(results.mudancas).forEach(([classe, area]) => {
        pdf.text(`${classe}: -${(area as number).toFixed(2)} ha`, margin, yPosition)
        yPosition += 6
      })
      yPosition += 10
    }

    // Nova página se necessário
    if (yPosition > 200) {
      pdf.addPage()
      yPosition = margin
    }

    // Distribuição Final das Áreas (tabela)
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(14)
    pdf.text("DISTRIBUIÇÃO FINAL DAS ÁREAS", margin, yPosition)
    yPosition += 15

    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(9)
    pdf.text("Classe de Uso", margin, yPosition)
    pdf.text("Área Original", margin + 50, yPosition)
    pdf.text("Área Final", margin + 80, yPosition)
    pdf.text("Valor (R$/ha)", margin + 110, yPosition)
    pdf.text("Valor Total Final", margin + 150, yPosition)
    yPosition += 10

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    Object.entries(results.distribuicaoFinal).forEach(([classe, dados]) => {
      const areaOriginal = parseFloat((formData.uso[classe]?.area || "0").replace(",", ".")) || 0
      pdf.text(classe.substring(0, 15), margin, yPosition)
      pdf.text(areaOriginal.toFixed(2), margin + 50, yPosition)
      pdf.text(dados.area.toFixed(2), margin + 80, yPosition)
      pdf.text(formatCurrency(dados.valor).replace("R$", ""), margin + 110, yPosition)
      pdf.text(formatCurrency(dados.area * dados.valor).replace("R$", ""), margin + 150, yPosition)
      yPosition += 7
    })

    yPosition += 5
    pdf.setFont("helvetica", "bold")
    pdf.text("TOTAL", margin, yPosition)
    pdf.text(formatCurrency(results.valorDepois).replace("R$", ""), margin + 150, yPosition)

    // Valor de Recomposição
    yPosition += 20
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(14)
    pdf.text("VALOR DE RECOMPOSIÇÃO", margin, yPosition)
    yPosition += 10

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.text(`Valor Antes: ${formatCurrency(results.valorAntes)}`, margin, yPosition)
    pdf.text(`Valor Após: ${formatCurrency(results.valorDepois)}`, margin + 80, yPosition)
    yPosition += 6
    pdf.text(`Valor de Recomposição: ${formatCurrency(results.valorRecomposicao)}`, margin, yPosition)
    pdf.text(`Custo para Recompor: ${formatCurrency(results.custoRecompor)}`, margin + 80, yPosition)
    yPosition += 10

    pdf.setFont("helvetica", "bold")
    pdf.text(`CUSTO TOTAL DE RECOMPOSIÇÃO: ${formatCurrency(results.custoRecomposicaoTotal)}`, margin, yPosition)

    // Rodapé
    const dataAtual = new Date().toLocaleDateString("pt-BR")
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    pdf.text(`Relatório gerado em: ${dataAtual}`, margin, pdf.internal.pageSize.getHeight() - 10)

    const nomeArquivo = `passivo_ambiental_${formData.numeroMatricula || "sem_matricula"}_${new Date()
      .toISOString()
      .split("T")[0]}.pdf`
    pdf.save(nomeArquivo)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  // Helper to display numeric-like fields safely in PDF header
  function formFormFieldToDisplay(value: string) {
    return value === "" ? "0" : value
  }

  // Fields that are simple top-level inputs (exclude "uso")
  const SIMPLE_FIELDS: Array<keyof Omit<FormData, "uso">> = ["areaTotal", "rvRequerida", "rv2008", "numeroMatricula"]

  return (
    <div className="min-h-screen bg-background px-8 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Leaf className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground font-serif">Calculadora de Passivo Ambiental</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Cálculo de compensação e recomposição de Reserva Legal
          </p>
        </div>

        {errors.length > 0 && !results && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Erros de Validação
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="list-disc list-inside space-y-1 text-red-700">
                {errors.map((erro, index) => (
                  <li key={index}>{erro}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Formulário Principal */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Dados Gerais do Imóvel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {SIMPLE_FIELDS.map((field) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>
                    {field === "areaTotal" ? "Área Total do Imóvel (ha)" :
                     field === "rvRequerida" ? "RV Requerida (%)" :
                     field === "rv2008" ? "Área RV em 2008 (ha)" :
                     "Número da Matrícula"}
                  </Label>
                  <Input
                    id={field}
                    type="text"
                    value={formData[field]}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    inputMode={field !== "numeroMatricula" ? "decimal" : undefined}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Classes de Uso */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Classes de Uso da Terra</CardTitle>
            <CardDescription>Informe as áreas e valores por hectare para cada classe de uso</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {CLASSES.map((classe) => (
                <div key={classe} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
                  <div className="md:col-span-1 flex items-center">
                    <Label className="font-medium">{classe}</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`area-${classe}`} className="text-sm text-muted-foreground">Área (ha)</Label>
                    <Input
                      id={`area-${classe}`}
                      type="text"
                      inputMode="decimal"
                      value={formData.uso[classe]?.area || ""}
                      onChange={(e) => handleClasseChange(classe, "area", e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`valor-${classe}`} className="text-sm text-muted-foreground">Valor (R$/ha)</Label>
                    <Input
                      id={`valor-${classe}`}
                      type="text"
                      inputMode="decimal"
                      value={formData.uso[classe]?.valor || ""}
                      onChange={(e) => handleClasseChange(classe, "valor", e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="flex justify-center gap-4 py-4">
          <Button onClick={calcular} size="lg" className="px-8" disabled={loading}>
            <Calculator className="h-4 w-4 mr-2" />
            {loading ? "Calculando..." : "Calcular"}
          </Button>
          <Button onClick={limparFormulario} variant="outline" size="lg" className="px-8 bg-transparent">
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpar
          </Button>
          {results && (
            <Button
              onClick={exportarPDF}
              variant="outline"
              size="lg"
              className="px-8 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          )}
        </div>

        {/* Resultados */}
        {results && (
          <div className="space-y-6">
            {/* Resumo Passivo */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Resumo Passivo
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary break-words">
                      {results.areaReservaLegal.toFixed(2)} ha
                    </div>
                    <div className="text-sm text-muted-foreground">Área RL Necessária</div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600 break-words">
                        {results.compensacao.toFixed(2)} ha
                      </div>
                      <div className="text-sm text-muted-foreground">Área Compensação</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-lg font-bold text-orange-600 break-words">
                        {formatCurrency(results.valorCompensacao)}
                      </div>
                      <div className="text-sm text-muted-foreground">Valor para Compensar</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 break-words">
                        {results.recomposicao.toFixed(2)} ha
                      </div>
                      <div className="text-sm text-muted-foreground">Área Recomposição</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-lg font-bold text-blue-600 break-words">
                        {formatCurrency(results.custoRecomposicaoTotal)}
                      </div>
                      <div className="text-sm text-muted-foreground">Valor Total da Recomposição</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center p-4 border-2 rounded-lg bg-red-50 border-red-200">
                  <div className="text-3xl font-bold text-red-700 break-words">
                    {formatCurrency(results.valorCompensacao + results.custoRecomposicaoTotal)}
                  </div>
                  <div className="text-base text-red-600 font-medium">Passivo Total</div>
                </div>
              </CardContent>
            </Card>

            {/* Situação */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Situação
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                  <h4 className="font-semibold text-orange-800">Situação em 2008</h4>
                  <p className="text-orange-700">{results.situacao2008}</p>
                </div>
                <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                  <h4 className="font-semibold text-blue-800">Situação Atual</h4>
                  <p className="text-blue-700">{results.situacaoAtual}</p>
                </div>
              </CardContent>
            </Card>

            {/* Mudanças de Área */}
            {Object.keys(results.mudancas).length > 0 && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Mudanças de Área para Recomposição</CardTitle>
                  <CardDescription className="font-medium">
                    Áreas que serão convertidas para Remanescente de Vegetação
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {Object.entries(results.mudancas).map(([classe, area]) => (
                      <div key={classe} className="flex justify-between items-center p-4 border rounded-lg bg-card">
                        <span className="font-medium">{classe}</span>
                        <Badge variant="destructive" className="bg-red-600 text-white text-xl px-4 py-2 font-bold">
                          -{(area as number).toFixed(2)} ha
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Distribuição Final */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Distribuição Final das Áreas</CardTitle>
                <CardDescription>Projeção das áreas após a recomposição necessária</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full border-collapse bg-card">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 border-b font-semibold">Classe de Uso</th>
                        <th className="text-right p-4 border-b font-semibold">Área Original (ha)</th>
                        <th className="text-right p-4 border-b font-semibold">Área Final (ha)</th>
                        <th className="text-right p-4 border-b font-semibold">Valor (R$/ha)</th>
                        <th className="text-right p-4 border-b font-semibold">Valor Total Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(results.distribuicaoFinal).map(([classe, dados]) => (
                        <tr key={classe} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-4 font-medium">{classe}</td>
                          <td className="p-4 text-right text-muted-foreground">
                            {(parseFloat((formData.uso[classe]?.area || "0").replace(",", ".")) || 0).toFixed(2)}
                          </td>
                          <td
                            className={`p-4 text-right font-medium ${
                              dados.area !== (parseFloat((formData.uso[classe]?.area || "0").replace(",", ".")) || 0) ? "font-bold text-red-600" : ""
                            }`}
                          >
                            {dados.area.toFixed(2)}
                          </td>
                          <td className="p-4 text-right">{formatCurrency(dados.valor)}</td>
                          <td className="p-4 text-right font-semibold">{formatCurrency(dados.area * dados.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30">
                      <tr className="border-t-2 font-bold">
                        <td className="p-4">Total</td>
                        <td className="p-4 text-right text-muted-foreground">
                          {Object.values(formData.uso)
                            .reduce((sum, dados) => sum + (parseFloat(dados.area.replace(",", ".")) || 0), 0)
                            .toFixed(2)}
                        </td>
                        <td className="p-4 text-right">
                          {Object.values(results.distribuicaoFinal)
                            .reduce((sum, dados) => sum + dados.area, 0)
                            .toFixed(2)}
                        </td>
                        <td className="p-4"></td>
                        <td className="p-4 text-right text-primary">{formatCurrency(results.valorDepois)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Valores de Recomposição */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Valor de Recomposição</CardTitle>
                <CardDescription>Análise dos custos envolvidos na recomposição da Reserva Legal</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-xl font-semibold text-muted-foreground">
                      {formatCurrency(results.valorAntes)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor Antes</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-xl font-semibold text-muted-foreground">
                      {formatCurrency(results.valorDepois)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor Após</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-xl font-semibold text-muted-foreground">
                      {formatCurrency(results.valorRecomposicao)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor de Recomposição</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-xl font-semibold text-muted-foreground">
                      {formatCurrency(results.custoRecompor)}
                    </div>
                    <div className="text-sm text-muted-foreground">Custo para Recompor</div>
                  </div>
                </div>

                <div className="mt-4 p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(results.custoRecomposicaoTotal)}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">Custo Total de Recomposição</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      (Valor de Recomposição + Custo para Recompor)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
