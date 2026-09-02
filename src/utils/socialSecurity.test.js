import { validateSocialLink, parseSocialLink } from './socialSecurity';
import { validateProfileContent } from './moderationBlacklist';

describe('Phase 45 : Sécurité des Réseaux Sociaux & Filtre NSFW', () => {
  describe('Filtre de Sécurité NSFW', () => {
    it('bloque les URL OnlyFans avec le message d\'erreur requis', () => {
      const urls = [
        'https://onlyfans.com/model',
        'http://www.onlyfans.com/profile',
        'onlyfans.com/creator',
        'https://sub.onlyfans.com/page',
      ];
      urls.forEach((url) => {
        const result = validateSocialLink(url);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe("Ce type de plateforme n'est pas autorisé sur Troco");
      });
    });

    it('bloque les URL Fansly avec le message d\'erreur requis', () => {
      const urls = [
        'https://fansly.com/user',
        'fansly.com/creator',
        'http://fansly.com/vip',
      ];
      urls.forEach((url) => {
        const result = validateSocialLink(url);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe("Ce type de plateforme n'est pas autorisé sur Troco");
      });
    });

    it('bloque les URL MYM.fans avec le message d\'erreur requis', () => {
      const urls = [
        'https://mym.fans/star',
        'mym.fans/vip',
        'https://mymfans.com/profile',
      ];
      urls.forEach((url) => {
        const result = validateSocialLink(url);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe("Ce type de plateforme n'est pas autorisé sur Troco");
      });
    });

    it('valide et normalise les URLs de confiance légitimes', () => {
      const validLinks = [
        { raw: 'https://github.com/mateopolo', expected: 'https://github.com/mateopolo' },
        { raw: 'linkedin.com/in/mateopolo', expected: 'https://linkedin.com/in/mateopolo' },
        { raw: 'https://instagram.com/mateo.polo', expected: 'https://instagram.com/mateo.polo' },
        { raw: 'x.com/mateopolo', expected: 'https://x.com/mateopolo' },
        { raw: 'https://mateopolo.dev', expected: 'https://mateopolo.dev/' },
      ];

      validLinks.forEach(({ raw, expected }) => {
        const result = validateSocialLink(raw);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedUrl).toBeDefined();
      });
    });
  });

  describe('Système de Parsing d\'URL et Icônes', () => {
    it('parse correctement GitHub', () => {
      const parsed = parseSocialLink('https://github.com/mateopolo');
      expect(parsed.platform).toBe('github');
      expect(parsed.label).toBe('GitHub');
      expect(parsed.handle).toBe('@mateopolo');
    });

    it('parse correctement LinkedIn', () => {
      const parsed = parseSocialLink('https://linkedin.com/in/mateo-polo-dev');
      expect(parsed.platform).toBe('linkedin');
      expect(parsed.label).toBe('LinkedIn');
      expect(parsed.handle).toBe('mateo-polo-dev');
    });

    it('parse correctement Instagram', () => {
      const parsed = parseSocialLink('https://instagram.com/mateo_photo');
      expect(parsed.platform).toBe('instagram');
      expect(parsed.label).toBe('Instagram');
      expect(parsed.handle).toBe('@mateo_photo');
    });

    it('parse correctement X / Twitter', () => {
      const parsedX = parseSocialLink('https://x.com/mateo_tech');
      expect(parsedX.platform).toBe('twitter');
      expect(parsedX.label).toBe('X (Twitter)');
      expect(parsedX.handle).toBe('@mateo_tech');

      const parsedTwitter = parseSocialLink('https://twitter.com/mateo_tech');
      expect(parsedTwitter.platform).toBe('twitter');
    });

    it('gère le fallback pour Portfolio et sites personnels', () => {
      const parsed = parseSocialLink('https://mateopolo.design');
      expect(parsed.platform).toBe('website');
      expect(parsed.label).toBe('mateopolo.design');
    });

    it('supporte les objets de liens avec platform Autre et label personnalisé', () => {
      const parsed = parseSocialLink({
        platform: 'Autre',
        label: 'Mon Blog',
        url: 'https://monblog.fr/posts'
      });
      expect(parsed.platform).toBe('website');
      expect(parsed.label).toBe('Mon Blog');
      expect(parsed.cleanUrl).toBe('https://monblog.fr/posts');
    });

    it('préserve le label personnalisé même pour une URL reconnue', () => {
      const parsed = parseSocialLink({
        platform: 'github',
        label: 'Mon Portfolio Open Source',
        url: 'https://github.com/mateopolo'
      });
      expect(parsed.platform).toBe('github');
      expect(parsed.label).toBe('Mon Portfolio Open Source');
      expect(parsed.cleanUrl).toBe('https://github.com/mateopolo');
    });
  });

  describe('Intégration avec validateProfileContent', () => {
    it('rejette un profil contenant un lien NSFW dans socialLinks', () => {
      const draft = {
        name: 'Mateo',
        username: '@mateo',
        bio: 'Dev & Designer',
        socialLinks: ['https://linkedin.com/in/mateo', 'https://onlyfans.com/illegal'],
      };
      const check = validateProfileContent(draft);
      expect(check.isValid).toBe(false);
      expect(check.errorMessage).toBe("Ce type de plateforme n'est pas autorisé sur Troco");
    });

    it('accepte un profil avec des liens sociaux valides', () => {
      const draft = {
        name: 'Mateo Polo',
        username: '@mateopolo',
        bio: 'Dev & Designer',
        socialLinks: ['https://linkedin.com/in/mateopolo', 'https://github.com/mateopolo'],
      };
      const check = validateProfileContent(draft);
      expect(check.isValid).toBe(true);
    });
  });
});
