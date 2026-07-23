package portal.ti.queiroz.security;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM com IV aleatório por valor (nunca reaproveitado), prefixado ao ciphertext.
 * Utilitário estático (não é bean Spring) porque é usado por um {@code jakarta.persistence.AttributeConverter}
 * (CredencialPasswordConverter), instanciado pelo Hibernate por reflexão — fora do container de DI do Spring
 * a menos que se configure explicitamente o SpringBeanContainer do Hibernate. Ler a chave direto da variável
 * de ambiente evita essa complexidade adicional.
 */
public final class CryptoUtil {

    private static final String ALGORITMO = "AES/GCM/NoPadding";
    private static final int TAMANHO_IV_BYTES = 12;
    private static final int TAMANHO_TAG_BITS = 128;
    private static final SecureRandom RANDOM = new SecureRandom();

    private static volatile SecretKeySpec chaveCache;

    private CryptoUtil() {
    }

    private static SecretKeySpec obterChave() {
        if (chaveCache == null) {
            synchronized (CryptoUtil.class) {
                if (chaveCache == null) {
                    String chaveBase64 = System.getenv("CREDENCIAL_ENC_KEY");
                    if (chaveBase64 == null || chaveBase64.isBlank()) {
                        throw new IllegalStateException(
                                "Variável de ambiente CREDENCIAL_ENC_KEY não definida. É obrigatória para " +
                                        "criptografar/descriptografar o campo de senha do cofre de Credenciais.");
                    }
                    byte[] chaveBytes = Base64.getDecoder().decode(chaveBase64);
                    if (chaveBytes.length != 32) {
                        throw new IllegalStateException(
                                "CREDENCIAL_ENC_KEY deve decodificar para exatamente 32 bytes (AES-256). Tamanho atual: " + chaveBytes.length);
                    }
                    chaveCache = new SecretKeySpec(chaveBytes, "AES");
                }
            }
        }
        return chaveCache;
    }

    public static String encrypt(String textoClaro) {
        if (textoClaro == null) return null;
        try {
            byte[] iv = new byte[TAMANHO_IV_BYTES];
            RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITMO);
            cipher.init(Cipher.ENCRYPT_MODE, obterChave(), new GCMParameterSpec(TAMANHO_TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(textoClaro.getBytes(StandardCharsets.UTF_8));

            byte[] combinado = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combinado, 0, iv.length);
            System.arraycopy(ciphertext, 0, combinado, iv.length, ciphertext.length);

            return Base64.getEncoder().encodeToString(combinado);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Falha ao criptografar valor.", e);
        }
    }

    public static String decrypt(String valorCriptografado) {
        if (valorCriptografado == null) return null;
        try {
            byte[] combinado = Base64.getDecoder().decode(valorCriptografado);
            byte[] iv = new byte[TAMANHO_IV_BYTES];
            byte[] ciphertext = new byte[combinado.length - TAMANHO_IV_BYTES];
            System.arraycopy(combinado, 0, iv, 0, TAMANHO_IV_BYTES);
            System.arraycopy(combinado, TAMANHO_IV_BYTES, ciphertext, 0, ciphertext.length);

            Cipher cipher = Cipher.getInstance(ALGORITMO);
            cipher.init(Cipher.DECRYPT_MODE, obterChave(), new GCMParameterSpec(TAMANHO_TAG_BITS, iv));
            byte[] textoClaro = cipher.doFinal(ciphertext);

            return new String(textoClaro, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Falha ao descriptografar valor.", e);
        }
    }
}
