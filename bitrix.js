const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Cole aqui o STAGE_ID da coluna Bitrix que dispara (ex: 'EXECUTING', 'PREPARATION', etc)
const STAGE_ID_DESEJADO = 'PREPAYMENT_INVOICE';

// Cole aqui o endpoint autenticado do AtendeSeg:
const ENDPOINT_ATENSEG = 'https://enterprise-176api.atendeseg.com.br/w/0c49f13f-e5b4-4bb4-a2ae-49d4d373bb56';

// Mensagem padrão que será enviada para o cliente
const MENSAGEM_PADRAO = 'Seu atendimento foi iniciado!';

// Endpoint do middleware
app.post('/webhook-bitrix', async (req, res) => {
  const negocio = req.body.FIELDS || req.body;
  if (negocio.STAGE_ID === STAGE_ID_DESEJADO) {
    const telefone = negocio.PHONE && negocio.PHONE[0]?.VALUE 
      ? negocio.PHONE[0].VALUE.replace(/\D/g, '') 
      : null;
    if (telefone) {
      const payload = {
        number: telefone,
        body: MENSAGEM_PADRAO,
        externalKey: `deal-${negocio.ID}`
      };
      try {
        await axios.post(ENDPOINT_ATENSEG, payload, { headers: { 'Content-Type': 'application/json' } });
        res.status(200).send('Mensagem enviada via AtendeSeg!');
      } catch (err) {
        res.status(500).send('Erro ao enviar para AtendeSeg.');
      }
    } else {
      res.status(400).send('Telefone não encontrado.');
    }
  } else {
    res.status(200).send('Negócio em coluna não-alvo; nada feito.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Middleware rodando na porta ${PORT}`));
