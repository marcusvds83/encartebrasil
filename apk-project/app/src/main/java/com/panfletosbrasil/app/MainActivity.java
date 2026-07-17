package com.panfletosbrasil.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.Button;
import android.widget.TextView;

public class MainActivity extends Activity {

    private WebView webView;
    private static final String APP_URL = "https://panfletosbrasil.onrender.com";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Status bar color
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#B91C1C"));

        // Main layout
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setBackgroundColor(Color.WHITE);

        webView = new WebView(this);
        webView.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.MATCH_PARENT));

        try {
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            // User-Agent: remove "; wv" para evitar Google "disallowed_useragent"
            // O Google bloqueia OAuth em WebViews detectando "; wv" no UA
            String originalUA = settings.getUserAgentString();
            String cleanUA = originalUA
                .replaceAll(";\\s*wv\\b", "")
                .replaceAll("\\s{2,}", " ")
                .trim()
                + " PanfletosBrasilApp/1.0";
            settings.setUserAgentString(cleanUA);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String url = request.getUrl().toString();
                    if (url.startsWith(APP_URL) || url.contains("google.com") || url.contains("firebaseapp.com")) {
                        return false;
                    }
                    return false;
                }

                @Override
                public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                    showErrorPage();
                }
            });

            webView.setWebChromeClient(new WebChromeClient());

            // Enable cookie persistence (CRITICAL for login/session)
            CookieManager.getInstance().setAcceptCookie(true);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
            CookieManager.getInstance().flush();

            webView.loadUrl(APP_URL);
        } catch (Exception e) {
            showErrorPage();
        }

        layout.addView(webView);
        setContentView(layout);
    }

    private void showErrorPage() {
        runOnUiThread(() -> {
            LinearLayout errorLayout = new LinearLayout(this);
            errorLayout.setOrientation(LinearLayout.VERTICAL);
            errorLayout.setGravity(android.view.Gravity.CENTER);
            errorLayout.setBackgroundColor(Color.WHITE);
            errorLayout.setPadding(48, 48, 48, 48);

            TextView msg = new TextView(this);
            msg.setText("Sem conexão com o servidor.\nVerifique sua internet e tente novamente.");
            msg.setTextColor(Color.parseColor("#666666"));
            msg.setTextSize(16);
            msg.setGravity(android.view.Gravity.CENTER);

            Button retry = new Button(this);
            retry.setText("Tentar Novamente");
            retry.setTextColor(Color.WHITE);
            retry.setBackgroundColor(Color.parseColor("#DC2626"));
            retry.setPadding(32, 16, 32, 16);
            retry.setOnClickListener(v -> {
                errorLayout.removeAllViews();
                webView.setVisibility(View.VISIBLE);
                webView.reload();
            });

            int dp16 = (int)(16 * getResources().getDisplayMetrics().density);
            int dp12 = (int)(12 * getResources().getDisplayMetrics().density);
            LinearLayout.LayoutParams msgParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            msgParams.bottomMargin = dp16;
            msg.setLayoutParams(msgParams);

            LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            btnParams.gravity = android.view.Gravity.CENTER_HORIZONTAL;
            retry.setLayoutParams(btnParams);

            errorLayout.addView(msg);
            errorLayout.addView(retry);

            webView.setVisibility(View.GONE);
            LinearLayout parent = (LinearLayout) webView.getParent();
            if (parent != null) {
                parent.addView(errorLayout);
            }
        });
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        try {
            webView.reload();
        } catch (Exception ignored) {}
    }
}