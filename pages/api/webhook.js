import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    const secret = process.env.WEBHOOK_SECRET || 'sk-webhook-secret-2025-smartkids-kw-secure-key';

    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { action, repository, ref } = req.body;
    const eventType = req.headers['x-github-event'];

    console.log('Webhook received:', {
      event: eventType,
      action,
      repository: repository?.name,
      ref,
      timestamp: new Date().toISOString()
    });

    if (eventType === 'push' && ref === 'refs/heads/main') {
      console.log('🚀 Push to main branch detected - triggering deployment');
      // TODO: call deployment hook if needed
    }
    if (eventType === 'pull_request') {
      console.log('🔄 Pull request event:', action, `#${req.body.pull_request?.number}`);
    }
    if (eventType === 'release') {
      console.log('📦 Release event:', action, req.body.release?.tag_name);
    }
    if (eventType === 'issues') {
      console.log('🐛 Issue event:', action, `#${req.body.issue?.number}`);
    }
    if (eventType === 'secret_scanning_alert') {
      console.log('🔒 Secret scanning alert:', action);
    }
    if (eventType === 'code_scanning_alert') {
      console.log('🛡️ Code scanning alert:', action);
    }
    if (eventType === 'dependabot_alert') {
      console.log('🤖 Dependabot alert:', action);
    }
    if (eventType === 'workflow_run') {
      console.log('⚙️ Workflow run:', action, req.body.workflow_run?.conclusion);
    }
    if (eventType === 'deployment') {
      console.log('🌐 Deployment event:', action);
    }
    if (eventType === 'deployment_status') {
      console.log('📊 Deployment status:', req.body.deployment_status?.state);
    }

    return res.status(200).json({ 
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
