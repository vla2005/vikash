package com.vikash_api.integrations.fuellog;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.io.IOException;

/** Keep maintained providers' read/validate/write under one database transaction. */
final class FuelLogOAuthTransactionFilter extends OncePerRequestFilter {
    private final TransactionTemplate transactions;
    FuelLogOAuthTransactionFilter(PlatformTransactionManager manager) { transactions = new TransactionTemplate(manager); }
    @Override protected boolean shouldNotFilter(HttpServletRequest r) {
        return !r.getMethod().equals("POST") || !r.getServletPath().startsWith("/oauth2/");
    }
    @Override protected void doFilterInternal(HttpServletRequest r,HttpServletResponse s,FilterChain chain) throws IOException,ServletException {
        try { transactions.executeWithoutResult(status -> {
            try { chain.doFilter(r,s); } catch (IOException|ServletException e) { throw new Wrapped(e); }
        }); } catch (Wrapped e) {
            if (e.getCause() instanceof IOException io) throw io;
            throw (ServletException)e.getCause();
        }
    }
    private static class Wrapped extends RuntimeException { Wrapped(Exception e) { super(e); } }
}
