package portal.ti.queiroz.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
            // Valor gravado antes desta migração (ainda em texto plano). Devolve como está para não
            // quebrar a leitura; ao salvar essa credencial novamente pela tela, ela passa a ser
            // gravada já criptografada (convertToDatabaseColumn sempre criptografa).
            log.warn("Credencial com senha em formato legado (não criptografado) detectada. " +
                    "Abra e salve essa credencial na tela para migrá-la para o formato criptografado.");
            return senhaArmazenada;
        }
    }
}
