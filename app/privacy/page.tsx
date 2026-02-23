'use client';

export default function PrivacyPolicy() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      color: 'var(--text-primary)',
      padding: '60px 20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '50px',
        fontFamily: 'var(--font-sans)'
      }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          color: 'var(--accent-gold)',
          fontSize: '2.5rem',
          marginBottom: '40px',
          textAlign: 'center'
        }}>プライバシーポリシー</h1>

        <div style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>
          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--accent-gold)', fontSize: '1.3rem', marginBottom: '15px' }}>
              1. 個人情報の収集について
            </h2>
            <p style={{ opacity: 0.9 }}>
              本サービス「Fate Decoder - AIパーソナルリーディング」では、運命鑑定のために以下の情報を収集します：
            </p>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>お名前（ニックネーム可）</li>
              <li>生年月日</li>
              <li>血液型</li>
              <li>出生地</li>
              <li>相談内容</li>
            </ul>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--accent-gold)', fontSize: '1.3rem', marginBottom: '15px' }}>
              2. 個人情報の利用目的
            </h2>
            <p style={{ opacity: 0.9 }}>
              収集した個人情報は以下の目的で利用します：
            </p>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>マヤ暦、四柱推命、数秘術、西洋占星術、宿曜に基づく運命鑑定の実施</li>
              <li>AI（Gemini）による個別鑑定書の生成</li>
              <li>鑑定結果の記録・保存（Notionデータベース）</li>
              <li>サービス品質向上のための分析</li>
            </ul>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--accent-gold)', fontSize: '1.3rem', marginBottom: '15px' }}>
              3. 個人情報の保存と管理
            </h2>
            <p style={{ opacity: 0.9 }}>
              ご入力いただいた情報および鑑定結果は、Notion（Notion Labs, Inc.）のデータベースに保存されます。
              Notionは高度なセキュリティ対策を実施しており、情報は安全に管理されます。
            </p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--accent-gold)', fontSize: '1.3rem', marginBottom: '15px' }}>
              4. 第三者への提供
            </h2>
            <p style={{ opacity: 0.9 }}>
              以下の場合を除き、収集した個人情報を第三者に提供することはありません：
            </p>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>ご本人の同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
            </ul>
            <p style={{ opacity: 0.9, marginTop: '10px' }}>
              ※ AIによる鑑定生成のため、Google Gemini APIに情報が送信されます。
            </p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--accent-gold)', fontSize: '1.3rem', marginBottom: '15px' }}>
              5. 個人情報の開示・削除
            </h2>
            <p style={{ opacity: 0.9 }}>
              ご自身の個人情報の開示、訂正、削除をご希望される場合は、運営者までお問い合わせください。
              合理的な期間内に対応いたします。
            </p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--accent-gold)', fontSize: '1.3rem', marginBottom: '15px' }}>
              6. Cookie等の利用
            </h2>
            <p style={{ opacity: 0.9 }}>
              本サービスでは、より良いユーザー体験のためCookieを使用する場合があります。
              ブラウザの設定でCookieを無効化することも可能です。
            </p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--accent-gold)', fontSize: '1.3rem', marginBottom: '15px' }}>
              7. プライバシーポリシーの変更
            </h2>
            <p style={{ opacity: 0.9 }}>
              本プライバシーポリシーは、法令の変更や事業内容の変更により予告なく改定される場合があります。
              変更後のプライバシーポリシーは、本ページに掲載した時点で効力を生じるものとします。
            </p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--accent-gold)', fontSize: '1.3rem', marginBottom: '15px' }}>
              8. お問い合わせ
            </h2>
            <p style={{ opacity: 0.9 }}>
              個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。<br />
              運営者：SATOYAMA AI BASE<br />
              連絡先：satoyama-ai-base@tonari2tomaru.com
            </p>
          </section>

          <div style={{
            marginTop: '50px',
            paddingTop: '30px',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'right',
            opacity: 0.7,
            fontSize: '0.9rem'
          }}>
            制定日：2026年1月28日
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 40px',
              background: 'linear-gradient(135deg, #b8941c, #d4af37)',
              color: '#000',
              textDecoration: 'none',
              borderRadius: '30px',
              fontWeight: 600,
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            鑑定ページに戻る
          </a>
        </div>
      </div>
    </div>
  )
}
