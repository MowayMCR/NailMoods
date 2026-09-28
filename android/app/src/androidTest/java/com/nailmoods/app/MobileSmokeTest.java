package com.nailmoods.app;

import static org.junit.Assert.*;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class MobileSmokeTest {
  private String js(ActivityScenario<MainActivity> scenario,String source) throws Exception {
    CountDownLatch done=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
    scenario.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript(source,value->{result.set(value);done.countDown();}));
    assertTrue("WebView response",done.await(10,TimeUnit.SECONDS));return result.get();
  }
  private void waitFor(ActivityScenario<MainActivity> scenario,String condition) throws Exception {
    long end=SystemClock.elapsedRealtime()+30000;
    while(SystemClock.elapsedRealtime()<end){if("true".equals(js(scenario,condition)))return;SystemClock.sleep(200);}
    fail("Timed out: "+condition+"; UI="+js(scenario,"document.body.innerText.slice(0,1200)"));
  }
  @Test public void packagedAppStartsAndPersistsNativeData() throws Exception {
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      waitFor(scenario,"Boolean(document.querySelector('.app') && !document.getElementById('nm-boot'))");
      assertEquals("\"https://localhost\"",js(scenario,"location.origin"));
      assertEquals("true",js(scenario,"Capacitor.isNativePlatform()"));
      js(scenario,"window.__nmProbe=null;Capacitor.nativePromise('Preferences','set',{key:'test:roundtrip',value:'draft-kept'}).then(()=>Capacitor.nativePromise('Preferences','get',{key:'test:roundtrip'})).then(r=>window.__nmProbe=r.value).catch(()=>window.__nmProbe='FAIL')");
      waitFor(scenario,"window.__nmProbe==='draft-kept'");
      js(scenario,"location.hash='profil'");
      waitFor(scenario,"location.hash==='#profil'");
      assertEquals("true",js(scenario,"document.documentElement.scrollWidth<=innerWidth"));
      js(scenario,"window.__nmProbe=null;Capacitor.nativePromise('Filesystem','writeFile',{path:'test-roundtrip.txt',directory:'DATA',encoding:'utf8',data:'saved-result'}).then(()=>Capacitor.nativePromise('Filesystem','readFile',{path:'test-roundtrip.txt',directory:'DATA',encoding:'utf8'})).then(r=>window.__nmProbe=r.data).catch(()=>window.__nmProbe='FAIL')");
      waitFor(scenario,"window.__nmProbe==='saved-result'");
      scenario.recreate();
      waitFor(scenario,"Boolean(document.querySelector('.app') && !document.getElementById('nm-boot'))");
      js(scenario,"window.__nmProbe=null;Capacitor.nativePromise('Preferences','get',{key:'test:roundtrip'}).then(r=>window.__nmProbe=r.value)");
      waitFor(scenario,"window.__nmProbe==='draft-kept'");
      js(scenario,"Capacitor.nativePromise('Preferences','remove',{key:'test:roundtrip'});Capacitor.nativePromise('Filesystem','deleteFile',{path:'test-roundtrip.txt',directory:'DATA'})");
    }
  }
}
