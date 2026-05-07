export default function PrivacyPolicy() {
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[720px] px-6 py-12">
        <button
          onClick={() => window.history.back()}
          className="mb-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Voltar
        </button>

        <h1 className="text-2xl font-semibold text-foreground mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
          Política de Privacidade — Recrutamento e Seleção
        </h1>

        <p className="text-sm text-muted-foreground mb-1">
          Empresa: <strong>Se Tu For, Eu Vou! Viagens e Recrutamento</strong>
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Vigência: {today}
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
          <section>
            <h2 className="text-base font-semibold mb-2">1. DADOS COLETADOS</h2>
            <p className="text-muted-foreground">
              Coletamos as seguintes informações durante o processo seletivo: nome completo, e-mail, telefone, perfil em redes sociais (LinkedIn e Instagram), currículo profissional e respostas ao formulário de candidatura.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">2. FINALIDADE</h2>
            <p className="text-muted-foreground">
              Seus dados são utilizados exclusivamente para avaliação de perfil e condução do processo seletivo para a vaga à qual você se candidatou.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">3. ARMAZENAMENTO</h2>
            <p className="text-muted-foreground">
              Seus dados ficam armazenados por até 12 meses após a candidatura. Após esse período, são excluídos de forma segura, salvo se você consentir com a inclusão no banco de talentos para oportunidades futuras.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">4. COMPARTILHAMENTO</h2>
            <p className="text-muted-foreground">
              Seus dados não são compartilhados com terceiros. O acesso é restrito à equipe interna de recrutamento da Se Tu For, Eu Vou.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">5. SEUS DIREITOS (LGPD — Lei 13.709/2018)</h2>
            <p className="text-muted-foreground">
              Você tem direito a: acessar seus dados, corrigir informações incorretas, solicitar a exclusão dos seus dados e revogar o consentimento a qualquer momento. Para exercer esses direitos, entre em contato pelo e-mail:{" "}
              <a href="mailto:atendimento@agenciasetuforeuvou.com" className="text-primary underline">
                atendimento@agenciasetuforeuvou.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">6. CONSENTIMENTO</h2>
            <p className="text-muted-foreground">
              Ao marcar a caixa de consentimento no formulário de candidatura, você confirma que leu esta política e autoriza o uso dos seus dados conforme descrito acima.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}