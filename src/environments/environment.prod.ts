import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: true,
  supabase: {
    url: 'https://ltyquqbxnjwqsyobgwqw.supabase.co',
    anonKey: 'sb_publishable__A2q2yjDP2Poef0fJ6r9JQ_7zrvoYWy'
  }
};
