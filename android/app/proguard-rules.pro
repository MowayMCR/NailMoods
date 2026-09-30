# Capacitor supplies consumer rules for dynamically discovered plugins/callbacks.
# Keep the JS bridge methods used reflectively by Android WebView.
-keepclassmembers class com.getcapacitor.** {
    @android.webkit.JavascriptInterface <methods>;
}
# Keep useful crash source locations; R8 mapping is archived with each release.
-keepattributes SourceFile,LineNumberTable
