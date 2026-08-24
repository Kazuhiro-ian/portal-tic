package portal.ti.queiroz.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// Criptografa/descriptografa o campo password de Credencial de forma transparente ao gravar/ler do banco.
@Converter
public class CredencialPasswordConverter implements AttributeConverter<String, String> {

    private static final Logger log = LoggerFactory.getLogger(CredencialPasswordConverter.class);

    @Override
    public String convertToDatabaseColumn(String senhaEmClaro) {
        return CryptoUtil.encrypt(senhaEmClaro);
    }

    @Override
    public String convertToEntityAttribute(String senhaArmazenada) {
        if (senhaArmazenada == null) return null;
        try {
            return CryptoUtil.decrypt(senhaArmazenada);
        } catch (RuntimeException e) {
            // Credencial cadastrada antes da criptografia existir: devolve o valor como está.
            log.warn("Credencial com senha em formato legado (não criptografado) detectada. " +
                    "Abra e salve essa credencial na tela para migrá-la para o formato criptografado.");
            return senhaArmazenada;
        }
    }
}
