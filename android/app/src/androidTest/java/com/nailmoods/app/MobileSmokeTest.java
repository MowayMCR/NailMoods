package com.nailmoods.app;

import static org.junit.Assert.*;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.view.KeyEvent;
import android.view.InputDevice;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.lifecycle.Lifecycle;
import com.getcapacitor.PluginResult;
import com.getcapacitor.JSObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.lang.reflect.Method;
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
    waitFor(scenario,condition,30000);
  }
  private void waitFor(ActivityScenario<MainActivity> scenario,String condition,long timeout) throws Exception {
    long end=SystemClock.elapsedRealtime()+timeout;
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
      scenario.moveToState(Lifecycle.State.CREATED);
      scenario.moveToState(Lifecycle.State.RESUMED);
      scenario.recreate();
      waitFor(scenario,"Boolean(document.querySelector('.app') && !document.getElementById('nm-boot'))");
      js(scenario,"window.__nmProbe=null;Capacitor.nativePromise('Preferences','get',{key:'test:roundtrip'}).then(r=>window.__nmProbe=r.value)");
      waitFor(scenario,"window.__nmProbe==='draft-kept'");
      js(scenario,"Capacitor.nativePromise('Preferences','remove',{key:'test:roundtrip'});Capacitor.nativePromise('Filesystem','deleteFile',{path:'test-roundtrip.txt',directory:'DATA'})");
    }
  }
  @Test public void androidBackClosesTheTopSheet() throws Exception {
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      waitFor(scenario,"Boolean(document.querySelector('.app') && !document.getElementById('nm-boot'))");
      js(scenario,"location.hash='profil/preferences'");
      waitFor(scenario,"Boolean(document.querySelector('.settingTile'))");
      js(scenario,"document.querySelector('.settingTile').click()");
      waitFor(scenario,"Boolean(document.querySelector('.nmDialogHost'))");
      scenario.onActivity(activity->activity.getOnBackPressedDispatcher().onBackPressed());
      waitFor(scenario,"!document.querySelector('.nmDialogHost')");
      assertEquals("\"#profil/preferences\"",js(scenario,"location.hash"));
      assertEquals("true",js(scenario,"Boolean(document.querySelector('.settingTile'))"));
    }
  }
  @Test public void restoredCameraResultUsesNativeListenerAndSurvivesRecreation() throws Exception {
    // Simulates Android delivering a restored Camera result. This is not a real camera/OS-kill test.
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      waitFor(scenario,"Boolean(document.querySelector('.app') && !document.getElementById('nm-boot'))");
      js(scenario,"location.hash='scan'");
      waitFor(scenario,"Boolean(document.querySelector('input[aria-label=\"Photo du vernis\"]'))");
      js(scenario,"window.__nmReady=false;Capacitor.nativePromise('Preferences','set',{key:'pending-native-media',value:JSON.stringify({route:'#scan',label:'Photo du vernis',index:0,principal:'guest',files:[]})}).then(()=>window.__nmReady=true)");
      waitFor(scenario,"window.__nmReady===true");
      scenario.onActivity(activity->{try{
        File fixture=new File(activity.getCacheDir(),"camera-restored-test.png");
        try(InputStream input=activity.getAssets().open("public/nailmoods-symbol.png");FileOutputStream output=new FileOutputStream(fixture)){byte[] buffer=new byte[8192];int n;while((n=input.read(buffer))!=-1)output.write(buffer,0,n);}
        JSObject photo=new JSObject();photo.put("path",fixture.toURI().toString());photo.put("format","png");
        PluginResult result=new PluginResult().put("pluginId","Camera").put("methodName","getPhoto").put("success",true).put("data",photo);
        Method restore=com.getcapacitor.App.class.getDeclaredMethod("fireRestoredResult",PluginResult.class);restore.setAccessible(true);restore.invoke(activity.getBridge().getApp(),result);
      }catch(Exception error){throw new AssertionError(error);}});
      waitFor(scenario,"Boolean(document.querySelector('.mobileStatus')?.textContent.includes('récupérée'))");
      scenario.recreate();
      waitFor(scenario,"Boolean(document.querySelector('.mobileStatus')?.textContent.includes('récupérée'))");
      js(scenario,"location.hash='scan'");
      waitFor(scenario,"Boolean(document.querySelector('input[aria-label=\"Photo du vernis\"]'))");
      js(scenario,"[...document.querySelectorAll('.mobileStatus button')].find(b=>b.textContent==='Réutiliser').click()");
      waitFor(scenario,"Boolean(JSON.parse(localStorage.getItem('nm-scan-draft-v1'))?.draft?.photo)");
      assertEquals("true",js(scenario,"Boolean(document.querySelector('.scanDetected img'))"));
      waitFor(scenario,"JSON.parse(localStorage.getItem('nm-scan-draft-v1'))?.draft?.recognitionInfo?.ocrViews?.length===1",100000);
      assertEquals("\"\"",js(scenario,"JSON.parse(localStorage.getItem('nm-scan-draft-v1')).draft.recognitionInfo.ocrError"));
      // Verify that the latest photo/OCR update reached the native copy, not only localStorage.
      js(scenario,"window.__nmDurable=false;crypto.subtle.digest('SHA-256',new TextEncoder().encode('nm-scan-draft-v1')).then(hash=>{const path='nailmoods-v1/'+[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')+'.json';const probe=()=>Capacitor.nativePromise('Filesystem','readFile',{path,directory:'DATA',encoding:'utf8'}).then(r=>{window.__nmDurable=JSON.parse(JSON.parse(r.data).value)?.draft?.recognitionInfo?.ocrViews?.length===1;if(!window.__nmDurable)setTimeout(probe,200)});return probe()})");
      waitFor(scenario,"window.__nmDurable===true");
      js(scenario,"localStorage.removeItem('nm-scan-draft-v1')");
      scenario.recreate();
      waitFor(scenario,"JSON.parse(localStorage.getItem('nm-scan-draft-v1'))?.draft?.recognitionInfo?.ocrViews?.length===1");
    }
  }
  @Test public void keyboardOpensAndBackKeepsTheForm() throws Exception {
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      waitFor(scenario,"Boolean(document.querySelector('.app') && !document.getElementById('nm-boot'))");
      js(scenario,"location.hash='profil/preferences'");
      waitFor(scenario,"Boolean(document.querySelector('.nameField input'))");
      js(scenario,"document.querySelector('.nameField input').scrollIntoView({block:'center',behavior:'instant'})");
      waitFor(scenario,"(()=>{const r=document.querySelector('.nameField input').getBoundingClientRect();return document.hasFocus()&&r.top>=0&&r.bottom<=(visualViewport?.height||innerHeight)})()");
      String center=js(scenario,"(()=>{const r=document.querySelector('.nameField input').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,devicePixelRatio]})()");
      org.json.JSONArray point=new org.json.JSONArray(center);int[] origin=new int[2];
      scenario.onActivity(activity->activity.getBridge().getWebView().getLocationOnScreen(origin));
      float x=origin[0]+(float)(point.getDouble(0)*point.getDouble(2)),y=origin[1]+(float)(point.getDouble(1)*point.getDouble(2));
      long now=SystemClock.uptimeMillis();
      MotionEvent down=MotionEvent.obtain(now,now,MotionEvent.ACTION_DOWN,x,y,0),up=MotionEvent.obtain(now,now+50,MotionEvent.ACTION_UP,x,y,0);
      down.setSource(InputDevice.SOURCE_TOUCHSCREEN);up.setSource(InputDevice.SOURCE_TOUCHSCREEN);
      // The IME can acquire its own window between down/up; use the system UI test API.
      assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(down,true));
      assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(up,true));
      down.recycle();up.recycle();
      AtomicReference<Boolean> visible=new AtomicReference<>(false);long end=SystemClock.elapsedRealtime()+15000;
      while(!visible.get()&&SystemClock.elapsedRealtime()<end){scenario.onActivity(activity->{WindowInsetsCompat insets=ViewCompat.getRootWindowInsets(activity.getWindow().getDecorView());visible.set(insets!=null&&insets.isVisible(WindowInsetsCompat.Type.ime()));});SystemClock.sleep(200);}
      assertTrue("Android keyboard opened",visible.get());
      assertEquals("true",js(scenario,"document.querySelector('.nameField input').getBoundingClientRect().bottom<=(visualViewport?.height||innerHeight)"));
      assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(new KeyEvent(KeyEvent.ACTION_DOWN,KeyEvent.KEYCODE_BACK),true));
      assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(new KeyEvent(KeyEvent.ACTION_UP,KeyEvent.KEYCODE_BACK),true));
      end=SystemClock.elapsedRealtime()+15000;
      while(visible.get()&&SystemClock.elapsedRealtime()<end){scenario.onActivity(activity->{WindowInsetsCompat insets=ViewCompat.getRootWindowInsets(activity.getWindow().getDecorView());visible.set(insets!=null&&insets.isVisible(WindowInsetsCompat.Type.ime()));});SystemClock.sleep(200);}
      assertFalse("Android keyboard closed",visible.get());
      assertEquals("\"#profil/preferences\"",js(scenario,"location.hash"));
      assertEquals("true",js(scenario,"Boolean(document.querySelector('.nameField input'))"));
    }
  }
}
