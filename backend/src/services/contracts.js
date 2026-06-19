const CROSSGEO = {
  name: 'CROSSGEO LTDA',
  cnpj: '56.195.515/0001-49',
  address: 'R. da Patagonia, 404, Sion, Belo Horizonte/MG, CEP 30.320-135'
};

function formatDate(d) {
  return (d || new Date()).toLocaleDateString('pt-BR');
}

function wrapEmail(title, subtitle, body) {
  return `
<div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;max-width:700px;margin:0 auto;padding:32px 20px;color:#1A1A2E">
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="color:#7B1E3C;font-size:28px;margin:0">VivaS</h1>
    <p style="color:#6B7280;font-size:14px;margin-top:4px">${subtitle}</p>
  </div>
  ${body}
  <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0">
  <p style="font-size:11px;color:#9CA3AF;text-align:center">VivaS Saude Inteligente | ${CROSSGEO.name} - CNPJ ${CROSSGEO.cnpj} | suporte@crossgeo.com.br</p>
</div>`;
}

function clause(num, title, text) {
  return `<p style="margin:8px 0 4px"><strong>CLAUSULA ${num} - ${title}</strong></p><p style="margin:0 0 8px">${text}</p>`;
}

function contractHeader(contractTitle, date) {
  return `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:24px;margin:20px 0;font-size:12px;line-height:1.8;color:#1A1A2E">
    <h3 style="text-align:center;color:#5E1730;margin-bottom:12px">${contractTitle}</h3>
    <p style="text-align:center;font-size:11px;color:#6B7280;margin-bottom:16px">Data: ${date}</p>`;
}

function contractFooter(signerName, signerDoc, date) {
  return `<p style="text-align:center;margin-top:16px;font-style:italic;font-size:11px">Assinado eletronicamente em ${date}</p>
    <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:11px">
      <div><strong>${signerName}</strong><br>${signerDoc}</div>
      <div style="text-align:right"><strong>VIVA S SAUDE INTELIGENTE</strong><br>${CROSSGEO.name}<br>CNPJ ${CROSSGEO.cnpj}</div>
    </div>
  </div>`;
}

function signatureBadge() {
  return `<div style="background:#E4F4EC;border-radius:10px;padding:16px;margin:16px 0">
    <p style="font-size:13px;font-weight:600;color:#166534;margin-bottom:4px">Assinatura eletronica valida</p>
    <p style="font-size:12px;color:#6B7280">Contrato assinado digitalmente conforme MP 2.200-2/2001 e Lei 14.063/2020. Representante VivaS: ${CROSSGEO.name} (CNPJ ${CROSSGEO.cnpj})</p>
  </div>`;
}

function generateMedicoContract(data) {
  const { fullName, cpf, registro, registroUf, especialidade, email, tempPassword } = data;
  const date = formatDate();
  const crmDoc = `CRM ${registro}/${registroUf}`;

  const body = `
    <p style="font-size:15px">Ola, <strong>${fullName}</strong>!</p>
    <p style="font-size:14px;color:#6B7280;line-height:1.6">Seu cadastro como medico na VivaS foi realizado com sucesso. Segue seu contrato assinado eletronicamente:</p>

    ${contractHeader('CONTRATO DE CREDENCIAMENTO E PRESTACAO DE SERVICOS MEDICOS', date)}
    <p style="font-size:11px;color:#6B7280;margin-bottom:8px">Profissional Medico x Plataforma VivaS - Telemedicina (Resolucao CFM n. 2.314/2022)</p>

    <p><strong>CONTRATANTE:</strong> ${CROSSGEO.name}, CNPJ ${CROSSGEO.cnpj}, ${CROSSGEO.address}, representando a plataforma VivaS Saude Inteligente.</p>
    <p><strong>CONTRATADO(A):</strong> ${fullName}, CPF ${cpf}, ${crmDoc}, Especialidade: ${especialidade || 'Geral'}.</p>

    ${clause('1a', 'DAS DEFINICOES',
      '1.1. Plataforma: ambiente tecnologico (web e aplicativos) de titularidade da VivaS que viabiliza triagem por inteligencia artificial, organizacao de historico clinico, interpretacao de exames com analise de tendencias, geracao de alertas preditivos e a realizacao de teleconsultas entre o MEDICO e os USUARIOS.<br>1.2. Teleconsulta: consulta medica nao presencial, mediada por TDICs, nos termos da Resolucao CFM n. 2.314/2022 e da Lei n. 14.510/2022.<br>1.3. Usuario/Paciente: pessoa fisica que utiliza a Plataforma e que podera ser atendida pelo MEDICO.<br>1.4. SRES: Sistema de Registro Eletronico de Saude.'
    )}

    ${clause('2a', 'DO OBJETO',
      '2.1. O presente Contrato tem por objeto o credenciamento do MEDICO na Plataforma e a regulacao da prestacao de servicos medicos, na modalidade de teleconsulta, aos Usuarios, observados os padroes eticos, tecnicos e legais aplicaveis ao exercicio da Medicina.<br>2.2. A Plataforma atua como meio tecnologico de intermediacao e infraestrutura, nao exercendo a Medicina nem interferindo na autonomia tecnica e no julgamento clinico do MEDICO.<br>2.3. A consulta presencial e o padrao-ouro de referencia, sendo a telemedicina ato complementar.'
    )}

    ${clause('3a', 'DA HABILITACAO E REQUISITOS DO MEDICO',
      '3.1. O MEDICO declara e garante que: possui inscricao ativa e regular no CRM; detem titulo de especialista ou registro de qualificacao compativel; mantem certificado digital no padrao ICP-Brasil para assinatura qualificada; e mantera seus dados permanentemente atualizados.<br>3.2. A VivaS podera, a qualquer tempo, solicitar comprovacao documental e suspender ou cancelar o credenciamento em caso de irregularidade.'
    )}

    ${clause('4a', 'DA NATUREZA DA RELACAO E INEXISTENCIA DE VINCULO',
      '4.1. O MEDICO presta os servicos com plena autonomia tecnica e profissional, sem subordinacao, habitualidade obrigatoria, pessoalidade ou exclusividade.<br>4.2. Nao se estabelece vinculo empregaticio, societario, de representacao ou mandato entre as Partes.<br>4.3. O MEDICO e o unico responsavel pela emissao de notas fiscais e pelo recolhimento dos tributos.'
    )}

    ${clause('5a', 'DAS OBRIGACOES DO MEDICO',
      '5.1. Atender os Usuarios com zelo, presteza e diligencia, segundo as boas praticas e o Codigo de Etica Medica; obter o termo de consentimento livre e esclarecido do paciente antes de cada teleconsulta; registrar adequadamente cada atendimento em prontuario eletronico; assinar prescricoes e atestados com certificado ICP-Brasil; indicar atendimento presencial quando necessario; realizar o atendimento em local privativo; nao discriminar Usuarios; responder integralmente, na esfera etica, civil e penal, pelo ato medico.'
    )}

    ${clause('6a', 'DAS OBRIGACOES DA VIVAS',
      '6.1. Disponibilizar o ambiente tecnologico em condicoes adequadas de funcionamento; manter sede em territorio nacional e inscricao no CRM; efetuar os repasses devidos; adotar medidas de seguranca da informacao; disponibilizar canal de suporte tecnico e operacional.<br>6.2. A VivaS nao garante volume minimo de atendimentos.'
    )}

    ${clause('7a', 'DA REMUNERACAO E DOS REPASSES',
      '7.1. O credenciamento na Plataforma e gratuito para o MEDICO.<br>7.2. Por cada teleconsulta efetivamente realizada, o MEDICO fara jus a remuneracao conforme tabela vigente na Plataforma, retendo a VivaS taxa pela intermediacao e uso da Plataforma.<br>7.3. Os repasses serao realizados na conta bancaria indicada pelo MEDICO em ate 7 dias uteis apos o fechamento do ciclo mensal.'
    )}

    ${clause('8a', 'DA AGENDA, CANCELAMENTOS E AUSENCIAS',
      '8.1. O MEDICO gerencia sua propria agenda na Plataforma.<br>8.2. Cancelamentos deverao ocorrer com antecedencia minima de 24 horas, salvo forca maior.<br>8.3. Faltas reiteradas e injustificadas poderao ensejar advertencia, suspensao ou descredenciamento.'
    )}

    ${clause('9a', 'DA PROTECAO DE DADOS PESSOAIS (LGPD)',
      '9.1. As Partes tratarao dados pessoais e dados sensiveis de saude em conformidade com a Lei n. 13.709/2018 (LGPD).<br>9.2. O MEDICO atua como controlador dos dados clinicos relativos ao ato medico; a VivaS atua como operadora quanto a infraestrutura.<br>9.3. O MEDICO obriga-se ao sigilo profissional e a confidencialidade.'
    )}

    ${clause('10a', 'DA PROPRIEDADE INTELECTUAL',
      '10.1. A Plataforma, o software, as marcas e os algoritmos sao de titularidade exclusiva da VivaS.<br>10.2. O MEDICO autoriza a VivaS a exibir seu nome, especialidade, CRM e foto profissional na Plataforma.'
    )}

    ${clause('11a', 'DA RESPONSABILIDADE',
      '11.1. O MEDICO responde, de forma pessoal e subjetiva, por todos os atos praticados no exercicio profissional.<br>11.2. A VivaS responde apenas por falhas diretamente imputaveis a infraestrutura tecnologica.'
    )}

    ${clause('12a', 'DA VIGENCIA E RESCISAO',
      '12.1. Vigencia por prazo indeterminado, a partir do aceite eletronico.<br>12.2. Rescisao imotivada por qualquer das Partes mediante aviso previo de 30 dias, sem multa.<br>12.3. Rescisao imediata pela VivaS em caso de perda de regularidade profissional, infracao etica ou legal.'
    )}

    ${clause('13a', 'DA CONFIDENCIALIDADE E NAO ALICIAMENTO',
      '13.1. O MEDICO mantera em sigilo as informacoes comerciais e tecnicas da VivaS por 2 anos apos o termino do Contrato.<br>13.2. O MEDICO nao utilizara dados de Usuarios para alicia-los a canais externos.'
    )}

    ${clause('14a', 'DAS DISPOSICOES GERAIS',
      '14.1. A tolerancia nao implica novacao ou renuncia.<br>14.2. A eventual nulidade de uma clausula nao prejudica as demais.<br>14.3. A VivaS podera alterar este Contrato mediante comunicacao previa.'
    )}

    ${clause('15a', 'DO FORO',
      '15.1. Fica eleito o foro da Comarca de Belo Horizonte/MG para dirimir as controversias.'
    )}

    ${clause('16a', 'DO ACEITE ELETRONICO',
      '16.1. O aceite eletronico, mediante selecao da caixa de concordancia e confirmacao na Plataforma, e registrado com data, hora (timestamp) e endereco IP, constituindo assinatura eletronica com plena validade juridica.'
    )}

    ${contractFooter(fullName, `CPF ${cpf} / ${crmDoc}`, date)}

    ${signatureBadge()}

    <div style="background:#F6E7E1;border-radius:10px;padding:16px;margin:16px 0">
      <p style="font-size:13px;font-weight:600;color:#7B1E3C;margin-bottom:4px">Seus dados de acesso:</p>
      <p style="font-size:13px;color:#6B7280">Email: ${email}</p>
      <p style="font-size:13px;color:#6B7280">Senha temporaria: <strong>${tempPassword}</strong></p>
      <p style="font-size:12px;color:#6B7280;margin-top:6px">Acesse <a href="https://vivas.digital/login" style="color:#7B1E3C">vivas.digital</a> e altere sua senha no primeiro acesso.</p>
    </div>`;

  return wrapEmail('VivaS', 'Contrato de Credenciamento - Medico', body);
}

function generatePsicologoContract(data) {
  const { fullName, cpf, registro, registroUf, especialidade, email, tempPassword } = data;
  const date = formatDate();
  const crpDoc = `CRP ${registro}/${registroUf}`;

  const body = `
    <p style="font-size:15px">Ola, <strong>${fullName}</strong>!</p>
    <p style="font-size:14px;color:#6B7280;line-height:1.6">Seu cadastro como psicologo na VivaS foi realizado com sucesso. Segue seu contrato assinado eletronicamente:</p>

    ${contractHeader('CONTRATO DE CREDENCIAMENTO E PRESTACAO DE SERVICOS PSICOLOGICOS', date)}
    <p style="font-size:11px;color:#6B7280;margin-bottom:8px">Profissional de Psicologia x Plataforma VivaS - Atendimento mediado por TDICs (Resolucao CFP n. 09/2024)</p>

    <p><strong>CONTRATANTE:</strong> ${CROSSGEO.name}, CNPJ ${CROSSGEO.cnpj}, ${CROSSGEO.address}, representando a plataforma VivaS Saude Inteligente.</p>
    <p><strong>CONTRATADO(A):</strong> ${fullName}, CPF ${cpf}, ${crpDoc}, Especialidade: ${especialidade || 'Psicologia Geral'}.</p>

    ${clause('1a', 'DAS DEFINICOES',
      '1.1. Plataforma: ambiente tecnologico de titularidade da VivaS que viabiliza a oferta de servicos psicologicos mediados por TDICs, agendamento, registro documental e atendimento aos Usuarios.<br>1.2. TDICs: Tecnologias Digitais da Informacao e da Comunicacao, na forma da Resolucao CFP n. 09/2024.<br>1.3. Atendimento on-line: servico psicologico prestado a distancia, em tempo real ou nao, mediado por TDICs.<br>1.4. Usuario: pessoa fisica que utiliza a Plataforma e que podera ser atendida pelo PSICOLOGO.'
    )}

    ${clause('2a', 'DO OBJETO',
      '2.1. O presente Contrato tem por objeto o credenciamento do PSICOLOGO na Plataforma e a regulacao da prestacao de servicos psicologicos aos Usuarios, na modalidade mediada por TDICs, observado o Codigo de Etica Profissional do Psicologo (CEPP) e a Resolucao CFP n. 09/2024.<br>2.2. A Plataforma atua como meio tecnologico de intermediacao e infraestrutura, nao interferindo na autonomia tecnica do PSICOLOGO.'
    )}

    ${clause('3a', 'DAS CARACTERISTICAS DO SERVICO E DOS RECURSOS TECNOLOGICOS (Art. 7, CFP 09/2024)',
      '3.1. Natureza do servico: atendimento psicologico (psicoterapia, orientacao, avaliacao e demais servicos compativeis), prestado de forma remota por meio das TDICs disponibilizadas pela Plataforma.<br>Recursos tecnologicos: videochamada criptografada, chat seguro e area de registro documental.<br>Especificidades e limitacoes: dependencia de conexao de internet estavel; necessidade de ambiente privativo.'
    )}

    ${clause('4a', 'DA HABILITACAO E REQUISITOS DO PSICOLOGO',
      '4.1. O PSICOLOGO declara e garante que: possui inscricao ativa e regular no CRP; reside e presta os servicos em territorio nacional; e capacitado tecnica e eticamente para os servicos que se propoe a oferecer por meio de TDICs; utilizara instrumentos psicologicos somente quando regulamentados e com parecer favoravel do SATEPSI.'
    )}

    ${clause('5a', 'DAS OBRIGACOES DO PSICOLOGO',
      '5.1. Avaliar em cada caso se o atendimento por TDICs e compativel com a demanda; obter o consentimento do Usuario; manter o registro documental do atendimento preservando o sigilo profissional; manter referencia de rede de apoio e servicos de saude da regiao do Usuario; realizar o atendimento em ambiente privativo; responder integralmente, na esfera etica, civil e penal, pelo ato profissional; emitir documentos psicologicos em conformidade com as resolucoes do CFP.'
    )}

    ${clause('6a', 'DAS OBRIGACOES DA VIVAS',
      '6.1. Disponibilizar o ambiente tecnologico seguro e funcional; manter plano de contingencia para queda de conexao; efetuar os repasses; tratar os dados em conformidade com a LGPD; disponibilizar suporte tecnico.<br>6.2. A VivaS nao garante volume minimo de atendimentos.'
    )}

    ${clause('7a', 'DA NATUREZA DA RELACAO E INEXISTENCIA DE VINCULO',
      '7.1. O PSICOLOGO atua com autonomia tecnica, sem subordinacao, exclusividade ou pessoalidade obrigatoria, nao se estabelecendo vinculo empregaticio, societario ou de representacao.<br>7.2. O PSICOLOGO e o unico responsavel pela emissao de notas fiscais e pelo recolhimento dos tributos.'
    )}

    ${clause('8a', 'DA REMUNERACAO E DOS REPASSES',
      '8.1. O credenciamento e gratuito para o PSICOLOGO.<br>8.2. Por cada atendimento efetivamente realizado, o PSICOLOGO fara jus a remuneracao conforme tabela vigente na Plataforma.<br>8.3. Os repasses ocorrerao em ate 7 dias uteis apos o fechamento do ciclo mensal.<br>8.4. Reajustes serao comunicados com 30 dias de antecedencia.'
    )}

    ${clause('9a', 'DA AGENDA, CANCELAMENTOS E AUSENCIAS',
      '9.1. O PSICOLOGO gerencia a propria agenda. Cancelamentos por sua iniciativa observarao antecedencia minima de 24 horas, salvo forca maior. Faltas reiteradas e injustificadas poderao ensejar advertencia, suspensao ou descredenciamento.'
    )}

    ${clause('10a', 'DA PROTECAO DE DADOS PESSOAIS (LGPD)',
      '10.1. As Partes tratarao dados pessoais e dados sensiveis de saude conforme a LGPD.<br>10.2. O PSICOLOGO atua como controlador dos dados relativos ao atendimento; a VivaS atua como operadora.<br>10.3. O PSICOLOGO obriga-se ao sigilo profissional.'
    )}

    ${clause('11a', 'DA PROPRIEDADE INTELECTUAL',
      '11.1. A Plataforma, o software e as marcas sao de titularidade exclusiva da VivaS. O PSICOLOGO autoriza a exibicao de seu nome, abordagem, CRP e foto profissional na Plataforma.'
    )}

    ${clause('12a', 'DA RESPONSABILIDADE',
      '12.1. O PSICOLOGO responde, de forma pessoal e subjetiva, pelos atos praticados no exercicio profissional.<br>12.2. A VivaS responde apenas por falhas diretamente imputaveis a infraestrutura tecnologica.'
    )}

    ${clause('13a', 'DA VIGENCIA E RESCISAO',
      '13.1. Vigencia por prazo indeterminado, a partir do aceite eletronico.<br>13.2. Rescisao imotivada por qualquer das Partes mediante aviso previo de 30 dias, sem multa.<br>13.3. Rescisao imediata pela VivaS em caso de perda de regularidade profissional, infracao etica ou legal.'
    )}

    ${clause('14a', 'DA CONFIDENCIALIDADE E NAO ALICIAMENTO',
      '14.1. O PSICOLOGO mantera sigilo sobre informacoes de negocio da VivaS por 2 anos apos o termino, e nao utilizara dados de Usuarios para alicia-los a canais externos.'
    )}

    ${clause('15a', 'DAS DISPOSICOES GERAIS E DO FORO',
      '15.1. A tolerancia nao implica novacao; a nulidade de uma clausula nao prejudica as demais; alteracoes serao comunicadas previamente.<br>15.2. Fica eleito o foro da Comarca de Belo Horizonte/MG.'
    )}

    ${clause('16a', 'DO ACEITE ELETRONICO',
      '16.1. O aceite eletronico e registrado com data, hora (timestamp) e endereco IP, constituindo assinatura eletronica com plena validade juridica.'
    )}

    ${contractFooter(fullName, `CPF ${cpf} / ${crpDoc}`, date)}

    ${signatureBadge()}

    <div style="background:#F6E7E1;border-radius:10px;padding:16px;margin:16px 0">
      <p style="font-size:13px;font-weight:600;color:#7B1E3C;margin-bottom:4px">Seus dados de acesso:</p>
      <p style="font-size:13px;color:#6B7280">Email: ${email}</p>
      <p style="font-size:13px;color:#6B7280">Senha temporaria: <strong>${tempPassword}</strong></p>
      <p style="font-size:12px;color:#6B7280;margin-top:6px">Acesse <a href="https://vivas.digital/login" style="color:#7B1E3C">vivas.digital</a> e altere sua senha no primeiro acesso.</p>
    </div>`;

  return wrapEmail('VivaS', 'Contrato de Credenciamento - Psicologo', body);
}

function generatePacienteTerms(data) {
  const { fullName, cpf, email, plan } = data;
  const date = formatDate();
  const planLabel = plan === 'familia' ? 'Familia' : plan === 'mental' ? 'Saude Mental' : 'Individual';

  const body = `
    <p style="font-size:15px">Ola, <strong>${fullName}</strong>!</p>
    <p style="font-size:14px;color:#6B7280;line-height:1.6">Bem-vindo(a) a VivaS! Segue seu contrato de termos e condicoes de uso, assinado eletronicamente no momento do seu cadastro:</p>

    ${contractHeader('TERMOS E CONDICOES DE USO, CONTRATO DE PRESTACAO DE SERVICOS E TERMO DE CONSENTIMENTO', date)}
    <p style="font-size:11px;color:#6B7280;margin-bottom:8px">Usuario (Cliente/Paciente) x Plataforma VivaS | Plano: ${planLabel}</p>

    <p><strong>CONTRATANTE:</strong> ${CROSSGEO.name}, CNPJ ${CROSSGEO.cnpj}, ${CROSSGEO.address}, representando a plataforma VivaS Saude Inteligente.</p>
    <p><strong>USUARIO:</strong> ${fullName}${cpf ? ', CPF ' + cpf : ''}, Email: ${email}.</p>

    ${clause('1a', 'DAS DEFINICOES',
      '1.1. Plataforma: ecossistema digital da VivaS (site e aplicativos) de saude preventiva.<br>1.2. Usuario: pessoa fisica que se cadastra e utiliza a Plataforma.<br>1.3. Profissional: medico, psicologo ou outro profissional de saude credenciado que realiza atendimentos.<br>1.4. Teleconsulta: atendimento de saude a distancia, mediado por TDICs.'
    )}

    ${clause('2a', 'DO OBJETO E DOS SERVICOS',
      '2.1. A VivaS oferece uma plataforma de saude preventiva inteligente, que pode incluir: (i) triagem inicial por inteligencia artificial; (ii) organizacao do historico clinico e da linha do tempo de saude; (iii) interpretacao de exames com analise de tendencias; (iv) alertas preditivos que identificam sinais e antecipam riscos; (v) teleconsultas com profissionais credenciados, sob modelo subsidiado; e (vi) beneficios e descontos junto a parceiros.<br>2.2. A VivaS atua como intermediadora e provedora de tecnologia, conectando o Usuario a Profissionais e parceiros independentes.'
    )}

    ${clause('3a', 'DA NATUREZA E DAS LIMITACOES DO SERVICO',
      '3.1. A VivaS nao e operadora de plano de saude nem de seguro-saude e nao oferece cobertura de internacao, cirurgia, procedimentos hospitalares ou reembolso assistencial.<br>3.2. Os alertas e analises gerados por inteligencia artificial tem carater informativo e preventivo, nao constituem diagnostico e nao substituem a avaliacao de um profissional de saude.<br>3.3. A teleconsulta e ato complementar e nao substitui o atendimento presencial.<br>3.4. A Plataforma nao e um servico de urgencia ou emergencia. Em caso de emergencia, procure o pronto-socorro mais proximo ou acione o SAMU (192) ou os Bombeiros (193).'
    )}

    ${clause('4a', 'DO CADASTRO E DA CONTA',
      '4.1. O Usuario deve fornecer informacoes verdadeiras, exatas e atualizadas, sendo o unico responsavel por elas e pela guarda de suas credenciais.<br>4.2. E vedado o uso por menores de 18 anos sem assistencia ou representacao dos responsaveis legais.<br>4.3. A VivaS podera suspender ou cancelar contas com indicios de fraude, uso indevido ou violacao destes Termos.'
    )}

    ${clause('5a', 'DOS PLANOS, PRECOS E PAGAMENTO',
      '5.1. A VivaS oferece planos de assinatura (valores vigentes, sujeitos a reajuste mediante aviso previo).<br>5.2. As teleconsultas nao estao incluidas de forma ilimitada na assinatura; serao cobradas por consulta, a valor subsidiado/com desconto.<br>5.3. A cobranca e recorrente, na periodicidade contratada, renovando-se automaticamente ate cancelamento.<br>5.4. O nao pagamento podera ensejar a suspensao do acesso.'
    )}

    ${clause('6a', 'DO DIREITO DE ARREPENDIMENTO E DO CANCELAMENTO',
      '6.1. Nos termos do art. 49 do Codigo de Defesa do Consumidor, o Usuario podera desistir da contratacao em ate 7 (sete) dias a contar da adesao, com devolucao integral dos valores.<br>6.2. Apos esse prazo, o Usuario podera cancelar a qualquer tempo; o cancelamento produz efeitos ao fim do ciclo ja pago.'
    )}

    ${clause('7a', 'DO CONSENTIMENTO PARA TELECONSULTA (CFM 2.314/2022)',
      '7.1. Ao optar por uma teleconsulta, o Usuario autoriza expressamente o atendimento a distancia e a transmissao de suas imagens e dados.<br>7.2. O Usuario pode negar a permissao de compartilhamento de seus dados, salvo em emergencia medica.<br>7.3. Prescricoes, atestados e relatorios serao emitidos com assinatura eletronica qualificada (ICP-Brasil).<br>7.4. A responsabilidade tecnica pelo ato de saude e exclusiva do Profissional.'
    )}

    ${clause('8a', 'DA PROTECAO DE DADOS PESSOAIS (LGPD)',
      '8.1. A VivaS trata dados pessoais e dados sensiveis de saude conforme a Lei n. 13.709/2018 (LGPD).<br>8.2. Bases legais: execucao de contrato; tutela da saude; cumprimento de obrigacao legal; e consentimento para finalidades especificas.<br>8.3. Finalidades: prestacao dos servicos, triagem, alertas, agendamento, faturamento, seguranca e melhoria da Plataforma.<br>8.4. Compartilhamento: com Profissionais responsaveis pelo atendimento, operadores de tecnologia/pagamento e parceiros.<br>8.5. Direitos do titular: confirmacao, acesso, correcao, anonimizacao, portabilidade, eliminacao e revogacao do consentimento, exerciveis pelo canal suporte@crossgeo.com.br.<br>8.6. Seguranca: criptografia, autenticacao e registro de logs.'
    )}

    ${clause('9a', 'DAS OBRIGACOES DO USUARIO',
      '9.1. O Usuario obriga-se a: usar a Plataforma de forma licita; prestar informacoes verdadeiras de saude; nao compartilhar suas credenciais; nao gravar atendimentos sem consentimento; e respeitar os direitos de propriedade intelectual da VivaS.'
    )}

    ${clause('10a', 'DAS RESPONSABILIDADES E LIMITACOES',
      '10.1. A VivaS empregara esforcos para manter a Plataforma disponivel e segura, mas nao garante funcionamento ininterrupto.<br>10.2. A responsabilidade tecnica pelos atos de saude e exclusiva dos Profissionais.<br>10.3. A VivaS nao se responsabiliza por danos decorrentes de uso indevido ou informacoes incorretas do Usuario.'
    )}

    ${clause('11a', 'DA PROPRIEDADE INTELECTUAL',
      '11.1. Todo o conteudo, software, marcas, modelos de IA e materiais da Plataforma pertencem a VivaS.'
    )}

    ${clause('12a', 'DO SUPORTE E DOS CANAIS DE ATENDIMENTO',
      '12.1. O Usuario podera contatar o suporte pelo email suporte@crossgeo.com.br ou WhatsApp +55 11 94738-2375.'
    )}

    ${clause('13a', 'DAS ALTERACOES DESTES TERMOS',
      '13.1. A VivaS podera alterar estes Termos, comunicando previamente o Usuario. A continuidade do uso implica concordancia.'
    )}

    ${clause('14a', 'DA VIGENCIA, LEGISLACAO E FORO',
      '14.1. Estes Termos vigoram por prazo indeterminado a partir do aceite.<br>14.2. Aplica-se a legislacao brasileira. Fica eleito o foro do domicilio do Usuario.'
    )}

    ${clause('15a', 'DO ACEITE ELETRONICO',
      '15.1. A aceitacao eletronica, mediante selecao do checkbox e confirmacao na Plataforma, constitui assinatura eletronica do tipo simples, registrada com data, hora (timestamp) e endereco IP, com plena validade juridica.'
    )}

    ${contractFooter(fullName, cpf ? 'CPF ' + cpf : 'Email: ' + email, date)}

    ${signatureBadge()}`;

  return wrapEmail('VivaS', 'Termos e Condicoes de Uso', body);
}

module.exports = { generateMedicoContract, generatePsicologoContract, generatePacienteTerms, CROSSGEO };
