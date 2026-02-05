export function TermsContent() {
  return (
    <div
      className="prose prose-sm max-w-none text-foreground space-y-6"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
    >
      <style>{`@media print { .terms-content { display: none !important; } }`}</style>

      <div className="terms-content">
        <p className="text-xs text-muted-foreground italic">
          Última atualização: 05 de fevereiro de 2026
        </p>

        {/* 1. Introdução */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">1. Introdução</h3>
          <p className="text-sm leading-relaxed">
            O <strong>Sinapse UTI</strong> é um sistema digital de gestão de leitos e passagem de plantão em Unidades de Terapia Intensiva (UTI), desenvolvido para profissionais de saúde devidamente habilitados. Este documento estabelece os <strong>Termos de Uso e Política de Privacidade</strong> que regem a utilização do sistema, em conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</strong> e demais normas aplicáveis à proteção de dados no Brasil.
          </p>
          <p className="text-sm leading-relaxed">
            Ao criar uma conta e utilizar o Sinapse UTI, o Usuário declara ter lido, compreendido e concordado integralmente com os termos aqui dispostos.
          </p>
        </section>

        {/* 2. Definições */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">2. Definições</h3>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li><strong>Usuário:</strong> profissional de saúde ou membro da equipe de regulação (NIR) que se cadastra e utiliza o sistema.</li>
            <li><strong>Dados Pessoais:</strong> informações relacionadas a pessoa natural identificada ou identificável, como nome, e-mail e CRM.</li>
            <li><strong>Dados Pessoais Sensíveis:</strong> dados sobre saúde, conforme Art. 5º, II da LGPD, incluindo informações clínicas de pacientes registradas no sistema.</li>
            <li><strong>Controlador:</strong> pessoa natural ou jurídica responsável pelas decisões referentes ao tratamento de dados pessoais no âmbito do Sinapse UTI.</li>
            <li><strong>Operador:</strong> pessoa que realiza o tratamento de dados pessoais em nome do Controlador.</li>
            <li><strong>Tratamento:</strong> toda operação realizada com dados pessoais, como coleta, armazenamento, consulta, utilização e eliminação.</li>
            <li><strong>LGPD:</strong> Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).</li>
          </ul>
        </section>

        {/* 3. Objeto */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">3. Objeto do Sistema</h3>
          <p className="text-sm leading-relaxed">
            O Sinapse UTI tem como finalidade principal:
          </p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Facilitar a <strong>passagem de plantão</strong> entre equipes médicas em UTIs, garantindo continuidade e segurança no cuidado ao paciente;</li>
            <li>Prover <strong>gestão de leitos</strong>, incluindo admissão, alta, transferência e bloqueio de leitos;</li>
            <li>Registrar informações clínicas essenciais como suporte respiratório, dispositivos invasivos, acessos venosos, drogas vasoativas, antibióticos, profilaxias e evoluções;</li>
            <li>Apoiar a <strong>regulação de vagas</strong> pelo Núcleo Interno de Regulação (NIR);</li>
            <li>Gerar <strong>documentos impressos</strong> de passagem de plantão para uso assistencial.</li>
          </ul>
        </section>

        {/* 4. Cadastro e Acesso */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">4. Cadastro e Acesso</h3>
          <p className="text-sm leading-relaxed">
            Para utilizar o sistema, o Usuário deverá:
          </p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Criar uma conta fornecendo nome completo, CRM (quando aplicável), e-mail e senha;</li>
            <li>Aguardar a <strong>aprovação de um administrador ou coordenador</strong> antes de obter acesso às funcionalidades;</li>
            <li>Manter suas credenciais em sigilo, sendo o único responsável por qualquer atividade realizada com sua conta;</li>
            <li>Comunicar imediatamente qualquer uso não autorizado de sua conta.</li>
          </ul>
          <p className="text-sm leading-relaxed">
            O sistema prevê os seguintes papéis: <strong>Administrador</strong>, <strong>Coordenador</strong>, <strong>Diarista</strong>, <strong>Plantonista</strong> e <strong>NIR (Regulação)</strong>. Cada papel possui permissões específicas de acesso e edição.
          </p>
        </section>

        {/* 5. Responsabilidades do Usuário */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">5. Responsabilidades do Usuário</h3>
          <p className="text-sm leading-relaxed">O Usuário compromete-se a:</p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Fornecer informações verdadeiras, atualizadas e completas no cadastro e no uso do sistema;</li>
            <li>Utilizar o sistema exclusivamente para fins profissionais e assistenciais;</li>
            <li>Não compartilhar credenciais de acesso com terceiros;</li>
            <li>Não tentar acessar dados de pacientes ou unidades fora de sua competência;</li>
            <li>Respeitar o sigilo profissional e a confidencialidade dos dados de pacientes;</li>
            <li>Não realizar cópias, capturas de tela ou reproduções não autorizadas de dados do sistema;</li>
            <li>Reportar falhas de segurança ou comportamentos anômalos ao administrador.</li>
          </ul>
        </section>

        {/* 6. Coleta de Dados */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">6. Coleta e Tratamento de Dados</h3>
          <p className="text-sm leading-relaxed">
            O Sinapse UTI coleta e trata os seguintes dados:
          </p>
          <h4 className="text-sm font-semibold mt-3 mb-1">6.1 Dados dos Usuários</h4>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Nome completo e CRM;</li>
            <li>Endereço de e-mail;</li>
            <li>Papel/função no sistema;</li>
            <li>Data e hora de cadastro e aceite dos termos;</li>
            <li>Registros de atividade (logs de impressão, sessões ativas, evoluções registradas).</li>
          </ul>
          <h4 className="text-sm font-semibold mt-3 mb-1">6.2 Dados de Pacientes</h4>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Iniciais do nome (sem nome completo);</li>
            <li>Idade, peso, diagnóstico principal e comorbidades;</li>
            <li>Dados clínicos: suporte respiratório, dispositivos, acessos venosos, drogas, antibióticos;</li>
            <li>Evoluções clínicas e planos terapêuticos;</li>
            <li>Status de regulação e dados de transferência;</li>
            <li>Precauções e alergias.</li>
          </ul>
          <p className="text-sm leading-relaxed mt-2">
            <strong>Importante:</strong> O sistema utiliza apenas as <strong>iniciais dos pacientes</strong>, não armazenando nomes completos, CPF, RG ou outros identificadores diretos, em conformidade com o princípio de minimização de dados (Art. 6º, III da LGPD).
          </p>
        </section>

        {/* 7. Base Legal */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">7. Base Legal para o Tratamento de Dados</h3>
          <p className="text-sm leading-relaxed">
            O tratamento de dados pessoais no Sinapse UTI fundamenta-se nas seguintes bases legais da LGPD:
          </p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li><strong>Art. 7º, I — Consentimento:</strong> o Usuário consente expressamente com o tratamento ao aceitar estes Termos e criar sua conta;</li>
            <li><strong>Art. 7º, V — Execução de contrato:</strong> o tratamento é necessário para a prestação do serviço contratado;</li>
            <li><strong>Art. 11, II, f — Tutela da saúde:</strong> para dados sensíveis de saúde dos pacientes, o tratamento é realizado exclusivamente para fins de tutela da saúde, em procedimento realizado por profissionais de saúde;</li>
            <li><strong>Art. 11, II, g — Garantia da prevenção à fraude e à segurança do titular:</strong> para logs de auditoria e controle de acesso.</li>
          </ul>
        </section>

        {/* 8. Finalidade */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">8. Finalidade do Tratamento</h3>
          <p className="text-sm leading-relaxed">Os dados coletados são utilizados exclusivamente para:</p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Operação e funcionamento do sistema de passagem de plantão;</li>
            <li>Gestão de leitos e regulação de vagas em UTI;</li>
            <li>Registro e continuidade do cuidado ao paciente;</li>
            <li>Geração de documentos impressos para uso assistencial;</li>
            <li>Controle de acesso e auditoria de ações realizadas no sistema;</li>
            <li>Melhoria contínua do sistema e correção de falhas.</li>
          </ul>
        </section>

        {/* 9. Compartilhamento */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">9. Compartilhamento de Dados</h3>
          <p className="text-sm leading-relaxed">
            Os dados tratados pelo Sinapse UTI <strong>não são comercializados</strong> e podem ser compartilhados apenas nas seguintes hipóteses:
          </p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Entre Usuários do mesmo sistema, conforme suas permissões de acesso e papel;</li>
            <li>Com prestadores de serviço de infraestrutura tecnológica (hospedagem e banco de dados), mediante contratos que garantam a proteção dos dados;</li>
            <li>Por determinação legal, judicial ou regulatória;</li>
            <li>Para proteção da vida ou da incolumidade física do titular ou de terceiro (Art. 7º, VII da LGPD).</li>
          </ul>
        </section>

        {/* 10. Segurança */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">10. Segurança da Informação</h3>
          <p className="text-sm leading-relaxed">
            O Sinapse UTI adota medidas técnicas e organizacionais para proteger os dados, incluindo:
          </p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li><strong>Criptografia:</strong> comunicações via HTTPS/TLS e senhas armazenadas com hash seguro;</li>
            <li><strong>Row Level Security (RLS):</strong> políticas de acesso em nível de banco de dados que garantem que cada Usuário acesse apenas os dados pertinentes ao seu papel e unidades atribuídas;</li>
            <li><strong>Controle de acesso baseado em papéis:</strong> administradores, coordenadores, diaristas, plantonistas e NIR possuem permissões granulares;</li>
            <li><strong>Sessões ativas:</strong> controle de sessões com expiração automática por inatividade;</li>
            <li><strong>Logs de auditoria:</strong> registro de impressões, evoluções e ações relevantes;</li>
            <li><strong>Aprovação de acesso:</strong> novos cadastros requerem aprovação de administrador ou coordenador antes da ativação.</li>
          </ul>
        </section>

        {/* 11. Direitos do Titular */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">11. Direitos do Titular dos Dados</h3>
          <p className="text-sm leading-relaxed">
            Em conformidade com o Art. 18 da LGPD, o Usuário titular dos dados pessoais tem direito a:
          </p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li><strong>Confirmação</strong> da existência de tratamento;</li>
            <li><strong>Acesso</strong> aos dados pessoais;</li>
            <li><strong>Correção</strong> de dados incompletos, inexatos ou desatualizados;</li>
            <li><strong>Anonimização, bloqueio ou eliminação</strong> de dados desnecessários ou tratados em desconformidade;</li>
            <li><strong>Portabilidade</strong> dos dados a outro fornecedor de serviço;</li>
            <li><strong>Eliminação</strong> dos dados tratados com consentimento;</li>
            <li><strong>Informação</strong> sobre entidades com as quais houve compartilhamento;</li>
            <li><strong>Revogação</strong> do consentimento.</li>
          </ul>
          <p className="text-sm leading-relaxed mt-2">
            Para exercer esses direitos, o Usuário deve entrar em contato através do canal indicado na Seção 15.
          </p>
        </section>

        {/* 12. Retenção */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">12. Retenção e Exclusão de Dados</h3>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Os dados de pacientes são mantidos enquanto o registro estiver ativo no sistema, podendo ser desativados (alta, óbito, transferência);</li>
            <li>Os dados de Usuários são mantidos enquanto a conta estiver ativa. Após exclusão da conta por administrador, os dados pessoais são removidos, preservando-se apenas registros de auditoria anonimizados;</li>
            <li>Logs de impressão e auditoria são mantidos por prazo indeterminado para fins de rastreabilidade assistencial, com anonimização do identificador do Usuário quando a conta é excluída;</li>
            <li>Dados poderão ser retidos por prazo superior quando houver obrigação legal ou regulatória.</li>
          </ul>
        </section>

        {/* 13. Cookies e Logs */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">13. Cookies, Sessões e Logs</h3>
          <p className="text-sm leading-relaxed">O Sinapse UTI utiliza:</p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li><strong>Tokens de autenticação:</strong> armazenados localmente para manter a sessão do Usuário;</li>
            <li><strong>Sessões ativas:</strong> registros em banco de dados que controlam o acesso simultâneo e a expiração por inatividade;</li>
            <li><strong>Logs de impressão:</strong> registros de cada documento impresso, incluindo Usuário, unidade, data/hora e pacientes envolvidos;</li>
            <li><strong>Registros de evolução:</strong> cada evolução clínica registra o Usuário autor e a data/hora da criação.</li>
          </ul>
          <p className="text-sm leading-relaxed mt-2">
            O sistema não utiliza cookies de rastreamento, análise comportamental ou publicidade.
          </p>
        </section>

        {/* 14. Atualizações */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">14. Atualizações dos Termos</h3>
          <p className="text-sm leading-relaxed">
            Estes Termos de Uso e Política de Privacidade podem ser atualizados a qualquer momento para refletir mudanças no sistema, na legislação ou nas práticas de tratamento de dados. Em caso de alterações substanciais:
          </p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Os Usuários serão notificados sobre as alterações;</li>
            <li>A data de última atualização será modificada no início deste documento;</li>
            <li>O uso continuado do sistema após a notificação constitui aceitação dos novos termos.</li>
          </ul>
        </section>

        {/* 15. Contato */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">15. Contato e Encarregado de Proteção de Dados (DPO)</h3>
          <p className="text-sm leading-relaxed">
            Para exercer seus direitos como titular de dados, esclarecer dúvidas sobre esta Política ou reportar incidentes de segurança, entre em contato:
          </p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li><strong>Canal de contato:</strong> Administrador do sistema ou coordenador da unidade</li>
            <li><strong>Encarregado (DPO):</strong> A ser designado pela instituição responsável pelo Sinapse UTI</li>
          </ul>
          <p className="text-sm leading-relaxed mt-2">
            A Autoridade Nacional de Proteção de Dados (ANPD) é o órgão competente para receber reclamações relacionadas ao tratamento de dados pessoais, conforme Art. 55-J da LGPD.
          </p>
        </section>

        {/* 16. Disposições Finais */}
        <section>
          <h3 className="text-base font-bold mt-4 mb-2">16. Disposições Finais</h3>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Estes Termos são regidos pela legislação brasileira;</li>
            <li>Eventuais litígios serão dirimidos no foro da comarca do Controlador;</li>
            <li>A nulidade ou invalidade de qualquer cláusula não prejudicará as demais;</li>
            <li>A tolerância no descumprimento de qualquer disposição não implica renúncia ao direito de exigi-la posteriormente;</li>
            <li>O Usuário declara estar ciente de que o sistema lida com dados de saúde, classificados como dados pessoais sensíveis pela LGPD, e compromete-se a tratá-los com o devido sigilo e responsabilidade profissional.</li>
          </ul>
        </section>

        <div className="border-t pt-4 mt-6">
          <p className="text-xs text-muted-foreground text-center">
            Sinapse UTI — Sistema de Passagem de Plantão e Gestão de Leitos em UTI
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Documento regido pela Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018)
          </p>
        </div>
      </div>
    </div>
  );
}
