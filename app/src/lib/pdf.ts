// PDF 저장 — 진료기록부 서식 DOM을 A4 PDF로 렌더링하여 다운로드.
// jspdf/html2canvas는 무거우므로 동적 import(별도 청크)로 필요 시에만 로드한다.
//
// 프로토타입 한계: html2canvas는 DOM을 래스터화하므로 텍스트가 이미지로 들어간다.
// 데스크톱(Tauri) 패키징 시에는 OS 인쇄→PDF 또는 네이티브 PDF 렌더러로 벡터 PDF를 생성한다.

export async function saveElementAsPdf(el: HTMLElement, filename: string): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  })

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageW = pdf.internal.pageSize.getWidth() // 210mm
  const pageH = pdf.internal.pageSize.getHeight() // 297mm
  const margin = 10
  const imgW = pageW - margin * 2
  const imgH = (canvas.height * imgW) / canvas.width
  const img = canvas.toDataURL('image/png')

  // 내용이 한 페이지를 넘으면 세로로 잘라 여러 페이지에 배치
  let heightLeft = imgH
  let position = margin
  pdf.addImage(img, 'PNG', margin, position, imgW, imgH)
  heightLeft -= pageH - margin * 2
  while (heightLeft > 0) {
    position = margin - (imgH - heightLeft) - margin
    pdf.addPage()
    pdf.addImage(img, 'PNG', margin, position, imgW, imgH)
    heightLeft -= pageH - margin * 2
  }

  pdf.save(filename)
}
