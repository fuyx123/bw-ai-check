import ExcelJS from 'exceljs';
import type { AnswerFile, GradingDetail } from '../services/exam';

const BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: 'FFD9D9D9' } },
  left:   { style: 'thin', color: { argb: 'FFD9D9D9' } },
  bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  right:  { style: 'thin', color: { argb: 'FFD9D9D9' } },
};

const HEADER_BG: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF2F7' } };
const INFO_BG:   ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
const SECTION_BG:ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE8C8' } };
const PASS_CLR  = 'FF389E0D';
const FAIL_CLR  = 'FFCF1322';
const SUB_CLR   = 'FF8C8C8C';

function applyBorder(row: ExcelJS.Row, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).border = BORDER;
  }
}

export async function exportGradingDetailToExcel(
  file: AnswerFile,
  detail: GradingDetail | null,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = '八维智能阅卷平台';
  wb.created = new Date();

  const ws = wb.addWorksheet('阅卷明细');

  // 列宽配置
  ws.columns = [
    { width: 12 },  // A 评分点层级
    { width: 52 },  // B 评分点内容
    { width: 10 },  // C 满分
    { width: 12 },  // D 得分
    { width: 10 },  // E 正确率
    { width: 42 },  // F 错误点
  ];

  const COLS = 6;

  // ── 行 1：标题 ──────────────────────────────────────────
  const className = file.className || '—';
  const title = `${className}  阅卷明细    文件：${file.originalName}    上传人：${file.uploaderName}`;
  const r1 = ws.addRow([title]);
  ws.mergeCells(`A1:F1`);
  const c1 = ws.getCell('A1');
  c1.value = title;
  c1.font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  c1.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2332' } };
  c1.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false, indent: 1 };
  r1.height = 34;

  // ── 行 2：列标题 ─────────────────────────────────────────
  const r2 = ws.addRow(['评分点层级', '评分点内容', '满分', '学生得分', '正确率', '错误点']);
  r2.eachCell((cell) => {
    cell.font      = { bold: true, size: 11 };
    cell.fill      = HEADER_BG;
    cell.border    = BORDER;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  r2.height = 22;

  // ── 行 3-5：学生信息 ──────────────────────────────────────
  const finalScore = file.manualScore != null ? file.manualScore : (detail?.totalScore ?? file.aiScore ?? 0);
  const isManual   = file.manualScore != null;

  const infoRows: [string, string | number][] = [
    ['学生姓名', file.uploaderName],
    ['AI总分',   detail?.totalScore ?? file.aiScore ?? 0],
    ['最终得分', `${finalScore}${isManual ? '（人工复阅）' : '（AI）'}`],
  ];

  for (const [label, val] of infoRows) {
    const r = ws.addRow(['', '', label, val, '', '']);
    r.getCell(3).font      = { bold: true, size: 11, color: { argb: 'FF595959' } };
    r.getCell(3).fill      = INFO_BG;
    r.getCell(3).border    = BORDER;
    r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(4).font      = { bold: true, size: 12 };
    r.getCell(4).fill      = INFO_BG;
    r.getCell(4).border    = BORDER;
    r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    r.height = 22;
  }

  // ── 汇总行：技能实践题 ────────────────────────────────────
  const totalMax = detail?.questions?.reduce((s, q) => s + (q.maxScore ?? 0), 0) ?? 100;
  const avgRate  = detail?.questions?.length
    ? Math.round(detail.questions.reduce((s, q) => s + q.correctRate, 0) / detail.questions.length)
    : 0;

  const rSummary = ws.addRow([
    '技能实践题',
    file.originalName,
    totalMax,
    finalScore,
    `${avgRate}%`,
    '',
  ]);
  rSummary.eachCell((cell, col) => {
    cell.font      = { bold: true, size: 11 };
    cell.fill      = SECTION_BG;
    cell.border    = BORDER;
    cell.alignment = { horizontal: col <= 2 ? 'left' : 'center', vertical: 'middle', wrapText: col === 2 };
  });
  rSummary.height = 22;

  // ── 逐题数据 ──────────────────────────────────────────────
  if (detail?.questions && detail.questions.length > 0) {
    detail.questions.forEach((q, idx) => {
      const passed = q.correctRate > 80;

      // 主行
      const rQ = ws.addRow([
        String(q.no ?? idx + 1),
        q.title ?? '',
        q.maxScore,
        q.score,
        `${q.correctRate}%`,
        q.errorPoints?.length > 0 ? q.errorPoints.join('；') : '无',
      ]);
      rQ.getCell(1).font      = { bold: false, size: 11 };
      rQ.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      rQ.getCell(2).alignment = { wrapText: true, vertical: 'middle' };
      rQ.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      rQ.getCell(4).font      = { bold: true, color: { argb: passed ? PASS_CLR : FAIL_CLR } };
      rQ.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      rQ.getCell(5).font      = { color: { argb: passed ? PASS_CLR : FAIL_CLR } };
      rQ.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      rQ.getCell(6).alignment = { wrapText: true, vertical: 'top' };
      applyBorder(rQ, COLS);
      rQ.height = 22;

      // 正确实现思路 子行
      if (q.correctApproach) {
        const rApproach = ws.addRow(['', `  ↳ 正确思路：${q.correctApproach}`, '', '', '', '']);
        ws.mergeCells(`B${rApproach.number}:F${rApproach.number}`);
        rApproach.getCell(2).font      = { italic: true, color: { argb: SUB_CLR }, size: 10 };
        rApproach.getCell(2).alignment = { wrapText: true, vertical: 'top', indent: 2 };
        applyBorder(rApproach, COLS);
        rApproach.height = 18;
      }
    });
  } else if (file.aiComment) {
    // 无结构化题目时降级展示 AI 原始批注
    const rComment = ws.addRow(['AI评语', file.aiComment, '', '', '', '']);
    ws.mergeCells(`B${rComment.number}:F${rComment.number}`);
    rComment.getCell(1).font      = { bold: true };
    rComment.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    applyBorder(rComment, COLS);
    rComment.height = 80;
  }

  // ── AI 综合评价 ───────────────────────────────────────────
  if (detail?.summary) {
    ws.addRow([]);
    const rEval = ws.addRow(['AI综合评价', detail.summary, '', '', '', '']);
    ws.mergeCells(`B${rEval.number}:F${rEval.number}`);
    rEval.getCell(1).font      = { bold: true, color: { argb: 'FF1677FF' } };
    rEval.getCell(1).fill      = INFO_BG;
    rEval.getCell(1).border    = BORDER;
    rEval.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
    rEval.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    rEval.getCell(2).border    = BORDER;
    rEval.height = 60;
  }

  // ── 人工复阅批注 ──────────────────────────────────────────
  if (file.manualComment) {
    const rManual = ws.addRow(['人工批注', file.manualComment, '', '', '', '']);
    ws.mergeCells(`B${rManual.number}:F${rManual.number}`);
    rManual.getCell(1).font      = { bold: true, color: { argb: 'FF52C41A' } };
    rManual.getCell(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6FFED' } };
    rManual.getCell(1).border    = BORDER;
    rManual.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
    rManual.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    rManual.getCell(2).border    = BORDER;
    rManual.height = 40;
  }

  // ── 生成并下载 ────────────────────────────────────────────
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${className}_${file.uploaderName}_阅卷明细.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
