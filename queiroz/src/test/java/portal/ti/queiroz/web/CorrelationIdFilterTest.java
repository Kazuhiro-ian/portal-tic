package portal.ti.queiroz.web;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class CorrelationIdFilterTest {

    private final CorrelationIdFilter filtro = new CorrelationIdFilter();

    @Test
    void geraUmIdQuandoOChamadorNaoMandaNenhum() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filtro.doFilter(request, response, chain);

        String idNoHeader = response.getHeader("X-Request-Id");
        assertThat(idNoHeader).isNotBlank();
        verify(chain).doFilter(request, response);
    }

    @Test
    void reaproveitaOIdQuandoOChamadorJaMandaUm() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Request-Id", "abc-123");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filtro.doFilter(request, response, chain);

        assertThat(response.getHeader("X-Request-Id")).isEqualTo("abc-123");
    }

    @Test
    void limpaCaracteresQueTentamForjarLinhaDeLogFalsa() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Request-Id", "abc\n2026-01-01 ERROR forjado");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filtro.doFilter(request, response, chain);

        String idNoHeader = response.getHeader("X-Request-Id");
        assertThat(idNoHeader).doesNotContain("\n").doesNotContain(" ");
    }

    @Test
    void removeOIdDoMdcDepoisDaRequisicao() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filtro.doFilter(request, response, (req, res) ->
                assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNotBlank());

        assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
    }
}
