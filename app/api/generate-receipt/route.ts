import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execPromise = promisify(exec)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { requestId, title, addressee, amount, paidAt, requesterId, creatorId } = body

    if (!requestId || !title || !amount || !paidAt || !requesterId || !creatorId) {
      console.error('Missing fields:', { requestId, title, amount, paidAt, requesterId, creatorId })
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missing: {
            requestId: !requestId,
            title: !title,
            amount: !amount,
            paidAt: !paidAt,
            requesterId: !requesterId,
            creatorId: !creatorId
          }
        },
        { status: 400 }
      )
    }

    if (!addressee || addressee.trim() === '') {
      console.error('Addressee is empty')
      return NextResponse.json(
        { error: 'Addressee is required' },
        { status: 400 }
      )
    }

    // 環境変数チェック
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      )
    }

    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase key not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey
    )

    // Requester（宛名）のビジネス情報取得
    const { data: requesterBusiness, error: requesterError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('profile_id', requesterId)
      .single()

    if (requesterError) {
      console.error('Requester business profile error:', requesterError)
      return NextResponse.json(
        { 
          error: 'Requester business profile not found',
          details: requesterError.message,
          requesterId
        },
        { status: 404 }
      )
    }

    if (!requesterBusiness) {
      console.error('Requester business is null for requesterId:', requesterId)
      return NextResponse.json(
        { error: 'Requester business profile not found', requesterId },
        { status: 404 }
      )
    }

    // Creator（発行者）のビジネス情報取得
    const { data: creatorBusiness, error: creatorError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('profile_id', creatorId)
      .single()

    if (creatorError) {
      console.error('Creator business profile error:', creatorError)
      return NextResponse.json(
        { 
          error: 'Creator business profile not found',
          details: creatorError.message,
          creatorId
        },
        { status: 404 }
      )
    }

    if (!creatorBusiness) {
      console.error('Creator business is null for creatorId:', creatorId)
      return NextResponse.json(
        { error: 'Creator business profile not found', creatorId },
        { status: 404 }
      )
    }

    // 必須項目のチェック
    const missingFields = []
    if (!creatorBusiness.last_name) missingFields.push('last_name')
    if (!creatorBusiness.first_name) missingFields.push('first_name')
    if (!creatorBusiness.postal_code) missingFields.push('postal_code')
    if (!creatorBusiness.prefecture) missingFields.push('prefecture')
    if (!creatorBusiness.address1) missingFields.push('address1')
    if (!creatorBusiness.phone) missingFields.push('phone')
    
    if (missingFields.length > 0) {
      console.error('Missing creator business fields:', missingFields)
      return NextResponse.json(
        { 
          error: 'Incomplete creator business profile',
          missingFields
        },
        { status: 400 }
      )
    }

    // PDFに渡すデータを準備
    const receiptData = {
      requestId,
      title,
      addressee,
      requester_account_type: requesterBusiness.account_type,
      amount,
      paidAt,
      creator: {
        last_name: creatorBusiness.last_name,
        first_name: creatorBusiness.first_name,
        company_name: creatorBusiness.company_name || '',
        postal_code: creatorBusiness.postal_code,
        prefecture: creatorBusiness.prefecture,
        address1: creatorBusiness.address1,
        address2: creatorBusiness.address2 || '',
        phone: creatorBusiness.phone
      }
    }

    // 一時ファイル
    const tmpDir = os.tmpdir()
    const timestamp = Date.now()
    const scriptPath = path.join(tmpDir, 'generate_receipt.py')
    const jsonPath = path.join(tmpDir, 'receipt_data_' + timestamp + '.json')
    const pdfPath = path.join(tmpDir, 'receipt_' + timestamp + '.pdf')

    // Pythonスクリプト
    const pythonScript = `import sys
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
import json
import os

def create_receipt(output_path, data):
    # Noto Sans JPフォントを登録（埋め込み）
    # フォントファイルのパスを探す
    font_paths = [
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
        'C:\\Windows\\Fonts\\msgothic.ttc',  # Windows MS Gothic
        'C:\\Windows\\Fonts\\YuGothM.ttc',   # Windows Yu Gothic Medium
    ]
    
    font_registered = False
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                pdfmetrics.registerFont(TTFont('JapaneseFont', font_path))
                font_registered = True
                break
            except:
                continue
    
    # フォントが見つからない場合はデフォルトのCIDフォントを使用
    if not font_registered:
        from reportlab.pdfbase.cidfonts import UnicodeCIDFont
        pdfmetrics.registerFont(UnicodeCIDFont('HeiseiMin-W3'))
        font_name = 'HeiseiMin-W3'
    else:
        font_name = 'JapaneseFont'
    
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4
    black = (0, 0, 0)
    gray = (0.5, 0.5, 0.5)
    light_gray = (0.9, 0.9, 0.9)
    margin = 50
    y = height - 60
    
    request_id = data.get("requestId", "")
    receipt_number = "領収書番号: DW-" + request_id[:8] if request_id else "領収書番号: DW-00000000"
    paid_at = data.get("paidAt", "")
    if paid_at:
        paid_date = datetime.fromisoformat(paid_at.replace('Z', '+00:00'))
        issue_date = paid_date.strftime("%Y年%m月%d日")
    else:
        issue_date = ""
    
    c.setFont(font_name, 10)
    c.setFillColorRGB(*black)
    c.drawRightString(width - margin, y, issue_date)
    y -= 14
    c.drawRightString(width - margin, y, receipt_number)
    y -= 40
    
    c.setFont(font_name, 28)
    c.drawCentredString(width / 2, y, '領 収 書')
    y -= 60
    
    left_x = margin
    right_x = width / 2 + 50
    addressee_y = y
    addressee_text = data.get("addressee", "")
    requester_account_type = data.get("requester_account_type", "individual")
    
    # 既存の「様」「御中」を削除
    if addressee_text:
        addressee_text = addressee_text.replace(' 様', '').replace('様', '').replace(' 御中', '').replace('御中', '')
        
        # account_typeに基づいて判定
        if requester_account_type == 'corporate':
            addressee_text = addressee_text + ' 御中'
        else:
            addressee_text = addressee_text + ' 様'
    
    addressee_lines = addressee_text.split('\\n')
    c.setFont(font_name, 14)
    for line in addressee_lines:
        c.drawString(left_x, addressee_y, line.strip())
        addressee_y -= 20
    
    info_y = y
    creator = data.get('creator', {})
    creator_company = creator.get('company_name')
    if creator_company:
        c.setFont(font_name, 12)
        c.setFillColorRGB(*black)
        c.drawString(right_x, info_y, creator_company)
        info_y -= 16
    
    creator_last_name = creator.get('last_name', '')
    creator_first_name = creator.get('first_name', '')
    creator_name = creator_last_name + ' ' + creator_first_name if creator_last_name or creator_first_name else ''
    if creator_name.strip():
        c.setFont(font_name, 12)
        c.setFillColorRGB(*black)
        c.drawString(right_x, info_y, creator_name)
        info_y -= 16
    
    c.setFont(font_name, 10)
    c.setFillColorRGB(*gray)
    creator_postal = creator.get('postal_code', '')
    creator_pref = creator.get('prefecture', '')
    creator_addr1 = creator.get('address1', '')
    creator_addr2 = creator.get('address2', '')
    c.drawString(right_x, info_y, "〒" + creator_postal)
    info_y -= 13
    c.drawString(right_x, info_y, creator_pref + creator_addr1)
    if creator_addr2:
        info_y -= 13
        c.drawString(right_x, info_y, creator_addr2)
    
    info_y -= 13
    phone = creator.get('phone', '')
    if phone and len(phone) >= 10:
        if len(phone) == 11:
            formatted_phone = phone[:3] + '-' + phone[3:7] + '-' + phone[7:]
        else:
            formatted_phone = phone[:2] + '-' + phone[2:6] + '-' + phone[6:]
        c.drawString(right_x, info_y, "TEL: " + formatted_phone)
    
    y = min(addressee_y, info_y) - 5
    amount = data.get("amount", 0)
    c.setFont(font_name, 12)
    c.setFillColorRGB(*black)
    c.drawString(left_x, y, '金額')
    y -= 20
    c.setFont(font_name, 24)
    amount_text = '¥ {:,} -'.format(amount)
    
    # 金額を右寄せで表示（アンダーラインの右端）
    amount_box_width = 250
    c.drawRightString(left_x + amount_box_width, y, amount_text)
    
    c.setLineWidth(1)
    c.line(left_x, y - 5, left_x + amount_box_width, y - 5)
    
    if amount >= 50000:
        stamp_x = width - margin - 100
        stamp_y = y - 5
        c.setLineWidth(0.5)
        c.setStrokeColorRGB(*light_gray)
        c.rect(stamp_x, stamp_y, 70, 35, fill=0, stroke=1)
        c.setFont(font_name, 8)
        c.setFillColorRGB(*gray)
        c.drawCentredString(stamp_x + 35, stamp_y + 24, '収入印紙')
        stamp_amount = '¥400' if amount >= 1000000 else '¥200'
        c.setFont(font_name, 11)
        c.setFillColorRGB(*black)
        c.drawCentredString(stamp_x + 35, stamp_y + 10, stamp_amount)
    
    y -= 35
    
    # 但し書き（先に表示、文字サイズ大きく）
    title = data.get("title", "")
    c.setFont(font_name, 11)
    c.setFillColorRGB(*black)
    c.drawString(left_x, y, '但し　' + title + 'として')
    
    y -= 20
    
    # 領収文言
    c.setFont(font_name, 10)
    c.drawString(left_x, y, '上記金額を正に領収いたしました')
    
    y -= 30
    
    table_x = margin
    table_width = width - margin * 2
    row_height = 22
    num_data_rows = 10
    col1_width = table_width * 0.5
    col2_width = table_width * 0.15
    col3_width = table_width * 0.15
    col4_width = table_width * 0.2
    table_height = row_height * (num_data_rows + 1)  # ヘッダー + データ行のみ
    table_top = y
    table_bottom = y - table_height
    
    # ヘッダー背景を先に描画
    c.setFillColorRGB(*light_gray)
    c.rect(table_x, y - row_height, table_width, row_height, fill=1, stroke=0)
    
    # 外枠を描画（細い線）
    c.setLineWidth(0.5)
    c.setStrokeColorRGB(*black)
    c.rect(table_x, table_bottom, table_width, table_height, stroke=1, fill=0)
    
    # ヘッダーテキスト
    c.setFont(font_name, 10)
    c.setFillColorRGB(*black)
    c.drawCentredString(table_x + col1_width / 2, y - 15, '品名')
    c.drawCentredString(table_x + col1_width + col2_width / 2, y - 15, '数量')
    c.drawCentredString(table_x + col1_width + col2_width + col3_width / 2, y - 15, '単価')
    c.drawCentredString(table_x + col1_width + col2_width + col3_width + col4_width / 2, y - 15, '金額')
    
    # ヘッダー下の横線を再描画
    c.setLineWidth(0.5)
    c.setStrokeColorRGB(*black)
    c.line(table_x, y - row_height, table_x + table_width, y - row_height)
    
    current_y = y - row_height
    
    # 税込み金額から逆算
    subtotal = int(amount / 1.1)
    tax = amount - subtotal
    
    for i in range(num_data_rows):
        current_y -= row_height
        c.setLineWidth(0.5)
        c.line(table_x, current_y, table_x + table_width, current_y)
        
        # 1行目にデータを表示（税抜き金額）
        if i == 0:
            c.setFont(font_name, 10)
            c.setFillColorRGB(*black)
            # 品名
            c.drawString(table_x + 5, current_y + 5, title)
            # 数量
            c.drawCentredString(table_x + col1_width + col2_width / 2, current_y + 5, '1')
            # 単価（税抜き）
            c.drawRightString(table_x + col1_width + col2_width + col3_width - 5, current_y + 5, '¥{:,}'.format(subtotal))
            # 金額（税抜き）
            c.drawRightString(table_x + col1_width + col2_width + col3_width + col4_width - 5, current_y + 5, '¥{:,}'.format(subtotal))
    
    # 縦線を描画（細い線）
    c.setLineWidth(0.5)
    c.setStrokeColorRGB(*black)
    c.line(table_x + col1_width, table_top, table_x + col1_width, table_bottom)
    c.line(table_x + col1_width + col2_width, table_top, table_x + col1_width + col2_width, table_bottom)
    c.line(table_x + col1_width + col2_width + col3_width, table_top, table_x + col1_width + col2_width + col3_width, table_bottom)
    
    # 表の外に小計・消費税・合計を表示（アンダーラインのみ）
    y = table_bottom - 35
    summary_right = table_x + table_width
    summary_left = summary_right - 150
    
    c.setFont(font_name, 10)
    c.setFillColorRGB(*black)
    
    # 小計
    c.drawString(summary_left, y, '小計')
    c.drawRightString(summary_right, y, '¥{:,}'.format(subtotal))
    c.setLineWidth(0.3)
    c.line(summary_left, y - 3, summary_right, y - 3)
    
    y -= 22
    # 消費税
    c.drawString(summary_left, y, '消費税(10%)')
    c.drawRightString(summary_right, y, '¥{:,}'.format(tax))
    c.line(summary_left, y - 3, summary_right, y - 3)
    
    y -= 22
    # 合計金額
    c.drawString(summary_left, y, '合計金額')
    c.drawRightString(summary_right, y, '¥{:,}'.format(amount))
    c.line(summary_left, y - 3, summary_right, y - 3)
    
    y -= 30
    c.setLineWidth(0.5)
    c.setStrokeColorRGB(*light_gray)
    c.line(margin, y, width - margin, y)
    y -= 15
    c.setFont(font_name, 8)
    c.setFillColorRGB(*gray)
    c.drawString(margin, y, 'この領収書は同人ワークスを通じた取引の証明として発行されます')
    y -= 12
    c.drawString(margin, y, '取引ID: ' + request_id)
    y -= 15
    c.setFont(font_name, 9)
    c.setFillColorRGB(*black)
    c.drawString(margin, y, '運営: 合同会社スタジオアサリ')
    
    # 運営会社の印鑑
    seal_x = margin + 150
    seal_y = y + 5
    c.setStrokeColorRGB(*light_gray)
    c.setLineWidth(0.5)
    c.circle(seal_x, seal_y, 20, fill=0, stroke=1)
    c.setFont(font_name, 6)
    c.setFillColorRGB(*gray)
    c.drawCentredString(seal_x, seal_y, '【印鑑】')
    
    y -= 12
    c.setFont(font_name, 8)
    c.setFillColorRGB(*gray)
    c.drawString(margin, y, '〒450-0002 愛知県名古屋市中村区名駅3丁目4-10 アルティメイト名駅1st 2階')
    c.save()

try:
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
    create_receipt(sys.argv[2], data)
    print('SUCCESS')
except Exception as e:
    import traceback
    print('ERROR:', str(e), file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
`

    fs.writeFileSync(scriptPath, pythonScript)
    fs.writeFileSync(jsonPath, JSON.stringify(receiptData, null, 2))

    // デバッグ用ログ
    console.log('Receipt data saved to:', jsonPath)
    
    // WindowsとLinux/macOSの両方に対応
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
    const command = pythonCmd + ' "' + scriptPath + '" "' + jsonPath + '" "' + pdfPath + '"'
    
    console.log('Executing command:', command)
    
    let stdout, stderr
    try {
      const result = await execPromise(command, {
        maxBuffer: 10 * 1024 * 1024
      })
      stdout = result.stdout
      stderr = result.stderr
    } catch (execError: any) {
      console.error('Python execution error:', execError)
      return NextResponse.json(
        { 
          error: 'Python execution failed',
          details: execError.message,
          stdout: execError.stdout,
          stderr: execError.stderr
        },
        { status: 500 }
      )
    }

    console.log('Python stdout:', stdout)
    if (stderr) {
      console.log('Python stderr:', stderr)
    }

    if (stderr && stderr.includes('Traceback')) {
      return NextResponse.json(
        { 
          error: 'Python script error',
          details: stderr
        },
        { status: 500 }
      )
    }

    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        { error: 'PDF file was not created', stdout, stderr },
        { status: 500 }
      )
    }

    const pdfBuffer = fs.readFileSync(pdfPath)

    // 一時ファイル削除
    try {
      fs.unlinkSync(scriptPath)
      fs.unlinkSync(jsonPath)
      fs.unlinkSync(pdfPath)
    } catch (e) {
      console.error('Failed to delete temp files:', e)
    }

    // PDFを返す
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="receipt_' + requestId + '.pdf"',
      },
    })
  } catch (error) {
    console.error('PDF生成エラー（詳細）:', error)
    console.error('エラースタック:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { 
        error: 'PDF生成に失敗しました',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}