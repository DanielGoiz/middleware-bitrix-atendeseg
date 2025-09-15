
const axios = require('axios');

// Configurações
const STAGE_ID_DESEJADO = 'PREPAYMENT_INVOICE';
const ENDPOINT_ATENSEG = 'https://enterprise-176api.atendeseg.com.br/w/0c49f13f-e5b4-4bb4-a2ae-49d4d373bb56';
const MENSAGEM_PADRAO = 'Seu atendimento foi iniciado!';

// Função para extrair e limpar o telefone
function extrairTelefone(negocio) {
  if (negocio.PHONE && negocio.PHONE[0]?.VALUE) {
    return negocio.PHONE[0].VALUE.replace(/\D/g, '');
  }
  if (negocio.HAS_PHONE && negocio.HAS_PHONE[0]?.VALUE) {
    return negocio.HAS_PHONE[0].VALUE.replace(/\D/g, '');
  }
  if (negocio.MOBILE && negocio.MOBILE[0]?.VALUE) {
    return negocio.MOBILE[0].VALUE.replace(/\D/g, '');
  }
  return null;
}

// Função para log detalhado
function logDetalhado(tipo, dados) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${tipo}:`, JSON.stringify(dados, null, 2));
}

// Handler principal para Vercel
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      message: 'Este endpoint aceita apenas POST'
    });
  }

  try {
    logDetalhado('WEBHOOK_RECEBIDO', req.body);
    
    const negocio = req.body.FIELDS || req.body;
    
    if (!negocio) {
      return res.status(400).json({
        success: false,
        message: 'Dados do negócio não encontrados no payload.'
      });
    }
    
    logDetalhado('NEGOCIO_DADOS', {
      ID: negocio.ID,
      STAGE_ID: negocio.STAGE_ID,
      TITLE: negocio.TITLE,
      PHONE: negocio.PHONE
    });
    
    // Verifica se o negócio está na etapa desejada
    if (negocio.STAGE_ID === STAGE_ID_DESEJADO) {
      const telefone = extrairTelefone(negocio);
      
      if (telefone) {
        const payload = {
          number: telefone,
          body: MENSAGEM_PADRAO,
          externalKey: `deal-${negocio.ID}`
        };
        
        logDetalhado('PAYLOAD_ATENSEG', payload);
        
        try {
          const response = await axios.post(ENDPOINT_ATENSEG, payload, { 
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });
          
          logDetalhado('SUCESSO_ATENSEG', response.data);
          return res.status(200).json({
            success: true,
            message: 'Mensagem enviada via AtendeSeg!',
            dealId: negocio.ID,
            phone: telefone
          });
          
        } catch (atendesegError) {
          logDetalhado('ERRO_ATENSEG', {
            error: atendesegError.message,
            response: atendesegError.response?.data
          });
          return res.status(500).json({
            success: false,
            message: 'Erro ao enviar para AtendeSeg',
            error: atendesegError.message
          });
        }
        
      } else {
        logDetalhado('ERRO_TELEFONE', 'Telefone não encontrado');
        return res.status(400).json({
          success: false,
          message: 'Telefone não encontrado no negócio.',
          dealId: negocio.ID
        });
      }
      
    } else {
      return res.status(200).json({
        success: true,
        message: `Negócio em etapa '${negocio.STAGE_ID}', não é a etapa alvo '${STAGE_ID_DESEJADO}'. Nada feito.`,
        dealId: negocio.ID
      });
    }
    
  } catch (error) {
    logDetalhado('ERRO_GERAL', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};
