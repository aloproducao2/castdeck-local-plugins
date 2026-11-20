// Plugin oficial: Luz do convidado (tier "code", roda em processo separado com a API do CastDeck).
// Liga/desliga uma tomada inteligente quando alguém entra/sai do palco e mostra o estado na tela.
export default function activate(castdeck) {
  let aceso = false;
  let ultimoAviso = 0;

  const chamar = async (url) => {
    const { token } = castdeck.settings.get();
    const cabecalhos = token ? { authorization: `Bearer ${token}` } : {};
    const r = await castdeck.http.post(url, {}, { headers: cabecalhos });
    if (!r || r.ok === false) return { ok: false, status: r?.result?.status };
    return { ok: true, status: r.result?.status };
  };

  const ligar = async (quem) => {
    const { urlLigar, aviso, segundos } = castdeck.settings.get();
    if (!urlLigar) return castdeck.log('sem urlLigar configurada');
    const r = await chamar(urlLigar);
    aceso = true;
    castdeck.log(`luz ligada para ${quem || 'convidado'} (${r.status ?? 'sem resposta'})`);
    if (aviso !== false) {
      const agora = Date.now();
      if (agora - ultimoAviso > 3000) {
        ultimoAviso = agora;
        castdeck.overlay.show({ titulo: 'Luz', texto: `${quem || 'Alguém'} entrou — luz acesa`, cor: '#7c5cff' }, Number(segundos) || 6);
      }
    }
  };

  const desligar = async (quem) => {
    const { urlDesligar } = castdeck.settings.get();
    if (!urlDesligar) return;
    const r = await chamar(urlDesligar);
    aceso = false;
    castdeck.log(`luz apagada (${quem || 'saída'}) (${r.status ?? 'sem resposta'})`);
  };

  castdeck.events.on('stage', async (e) => {
    try {
      if (!e) return;
      if (e.acao === 'entrou') await ligar(e.fonteNome || e.fonte);
      else if (e.acao === 'saiu' && aceso) await desligar(e.fonteNome || e.fonte);
    } catch (err) {
      castdeck.log(`erro no evento de palco: ${err.message}`);
    }
  });

  // aviso de que o plugin subiu (ajuda no diagnóstico)
  castdeck.log('luz pronta (aguardando alguém entrar no palco)');
}
