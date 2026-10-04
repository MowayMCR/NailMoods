package com.nailmoods.app;

import android.content.Intent;
import android.provider.CalendarContract;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.text.SimpleDateFormat;
import java.util.Locale;

@CapacitorPlugin(name = "NailMoodsCalendar")
public class NailMoodsCalendarPlugin extends Plugin {
    private long instant(String value) throws java.text.ParseException {
        SimpleDateFormat format = new SimpleDateFormat(value.contains(".") ? "yyyy-MM-dd'T'HH:mm:ss.SSSXXX" : "yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US);
        format.setLenient(false);
        return format.parse(value).getTime();
    }
    @PluginMethod
    public void open(PluginCall call) {
        try {
            String title = call.getString("title"), start = call.getString("start"), end = call.getString("end");
            if (title == null || start == null || end == null) { call.reject("Événement incomplet."); return; }
            long from = instant(start), to = instant(end);
            if (to <= from) { call.reject("Dates invalides."); return; }
            Intent intent = new Intent(Intent.ACTION_INSERT).setData(CalendarContract.Events.CONTENT_URI)
                .putExtra(CalendarContract.Events.TITLE, title)
                .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, from)
                .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, to)
                .putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, call.getBoolean("allDay", false))
                .putExtra(CalendarContract.Events.EVENT_TIMEZONE, call.getString("timezone", "Europe/Paris"))
                .putExtra(CalendarContract.Events.EVENT_LOCATION, call.getString("location", ""))
                .putExtra(CalendarContract.Events.DESCRIPTION, call.getString("notes", ""));
            getActivity().runOnUiThread(() -> {
                try { getActivity().startActivity(intent); JSObject result = new JSObject(); result.put("opened", true); call.resolve(result); }
                catch (Exception error) { call.reject("Aucun calendrier disponible. Utilise l’export .ics.", error); }
            });
        } catch (Exception error) { call.reject("Impossible de préparer cet événement.", error); }
    }
}
