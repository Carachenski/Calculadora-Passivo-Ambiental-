import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // URL do seu backend Python (ajuste conforme necessário)
    const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000"

    // Enviando dados para o backend Python
    const response = await fetch(`${PYTHON_BACKEND_URL}/calculate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Backend Python retornou erro: ${response.status}`)
    }

    const result = await response.json()

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erro ao comunicar com backend Python:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
