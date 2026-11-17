![Logo](admin/mh-logo.png)

# ioBroker.alpha2

Local control of the **Möhlenhoff Alpha 2** underfloor heating control (base station EZR) in ioBroker.
The adapter talks to the XML API of the base station in your network. No cloud account is needed.

This is a maintained fork of [Eisbaeeer/ioBroker.alpha2](https://github.com/Eisbaeeer/ioBroker.alpha2).
Version 2.0.0 is a rewrite. **It is a drop-in update for 1.x**: the adapter name, all state IDs and their
types stay the same, so aliases, scripts, visualisations and history (InfluxDB, SQL, History) keep working.

## What is new in 2.0

- **One request at a time.** The web server of the base station can handle only one connection; parallel
  requests are aborted (`Error: aborted`). The adapter now queues every request, like the web interface
  of the base station does, with a timeout per request and a longer pause while the base station does not answer.
- **Light polling.** Live values come from the small `cyclic.xml` (default every 10 s). The complete
  `static.xml` with actuators and settings is read every 30 s and after every change.
  Version 1.x read the complete file every 10 s.
- **`info.connection`** shows whether the base station answers; one warning in the log when it stops answering,
  one info when it is back.
- **More values:** party and presence mode, set point range, set point of the program, offset, heat area state,
  `HEATING` per heat area (an actuator of the area is open), `LOWBAT` and `UNREACH` per room unit, firmware
  versions, error counter, relay, cooling, ECO input, frost protection, cloud connection state.
- **Checked writing:** only the settings listed below can be written. Values are checked (range, quarter hours,
  dates) before they are sent, temperatures are limited to the range of the heat area. A rejected value is
  logged and the state shows the value of the base station again. A quick series of values (e.g. from a slider)
  sends only the last one.
- **Nothing secret in ioBroker:** cloud credentials, network settings, the expert code and the lock codes of
  the room units are never read into states.
- Writable temperatures get `min`/`max` of their heat area, so sliders in visualisations have the right range.
- No dependencies besides `@iobroker/adapter-core`; Admin 5+ settings page (JSON config).

## Settings

| Setting                          | Default | Meaning                                                       |
| -------------------------------- | ------- | ------------------------------------------------------------- |
| IP address of the base station   | –       | e.g. `192.168.1.100`, optionally with `:port`                 |
| Live values every (ms)           | 10000   | temperatures, set points, pump (`cyclic.xml`), at least 2000  |
| Actuators and settings every (s) | 30      | complete data (`static.xml`), additionally after every change |
| Timeout per request (ms)         | 5000    | a request without answer is cancelled after this time         |
| Set the clock automatically      | off     | see below                                                     |

If you use more than one base station, add one instance per base station.

### Clock of the base station

The base station runs its switching times on its own clock. Its NTP sync is often switched off, then the clock
drifts. With _Set the clock automatically_ the adapter compares the clock of the base station with ioBroker once an
hour and sets it to the time of ioBroker when it differs by more than 30 s. Nothing is set while the base station
syncs via NTP itself (`DEVICE.NTPSYNC`) and in the hours around the change between summer and winter time.
ioBroker and the base station must use the same time zone. `DEVICE.DATETIME` shows the clock of the base station.

## States

`HEATAREA.<n>` (heat area / room), `HEATCTRL.<n>` (actuator output), `IODEVICE.<n>` (room unit / sensor),
`PROGRAM.<program>.<period>`, `VACATION`, `DEVICE` (base station) and `info.connection`.

### Writable

| State                                           | Values                                                         |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `HEATAREA.<n>.T_TARGET`                         | set point in °C, rounded to 0.1, limited to `T_TARGET_MIN…MAX` |
| `HEATAREA.<n>.T_HEAT_DAY` / `T_HEAT_NIGHT`      | day / night temperature for heating in °C                      |
| `HEATAREA.<n>.T_COOL_DAY` / `T_COOL_NIGHT`      | day / night temperature for cooling in °C                      |
| `HEATAREA.<n>.HEATAREA_MODE`                    | `0` Auto, `1` Day, `2` Night                                   |
| `HEATAREA.<n>.PROGRAM_WEEK` / `PROGRAM_WEEKEND` | program `0`…`3`                                                |
| `HEATAREA.<n>.PARTY` / `PRESENCE`               | `true` / `false`                                               |
| `HEATAREA.<n>.ISLOCKED`                         | `0` unlocked, `1` locked (child lock of the room unit)         |
| `PROGRAM.<p>.<period>.START` / `END`            | `hh:mm` in quarter hours, `END` also `24:00`                   |
| `VACATION.START_DATE` / `END_DATE`              | `YYYY-MM-DD`                                                   |
| `VACATION.STATE`                                | `false` ends a vacation                                        |
| `DEVICE.T_HEAT_VACATION`                        | temperature during vacation in °C                              |
| `DEVICE.LOCK_MODE`                              | `0` / `1` (hotel mode)                                         |

The target temperature set with `T_TARGET` is valid until the next switching time of the program.

To set a vacation, first set `DEVICE.T_HEAT_VACATION`, then `VACATION.START_DATE` and `VACATION.END_DATE`.
`VACATION.STATE` shows whether the vacation is active.

System commands of the base station (factory reset, network or cloud settings, deleting data) can not be sent
by this adapter.

### Value formats

For compatibility with 1.x, a few values stay text: `HEATAREA_MODE`, `PROGRAM_WEEK`, `PROGRAM_WEEKEND`,
`ISLOCKED`, `HEATAREA_NR` and all `IODEVICE` values except `LOWBAT`/`UNREACH` (e.g. `BATTERY` = `"0"` red,
`"1"` yellow, `"2"` green). New values use numbers and booleans.

## Update from 1.x

Install the new version over the old one; the instance and its settings stay. Objects are extended, never
replaced, so custom settings such as history logging stay as they are. States of 1.x that the base station
does not deliver (e.g. unused program slots) are left untouched.

## Changelog

<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->

### 2.1.0 (2026-11-18)

- (djlex83) Optional: sets the clock of the base station when it is more than 30 s wrong (checked every hour)
- (djlex83) Requires Node.js 22 or newer

### 2.0.0 (2026-11-17)

- (djlex83) Rewrite: one request at a time with timeout and back-off, `info.connection`
- (djlex83) Polls the small `cyclic.xml` for live values, `static.xml` only every 30 s and after changes
- (djlex83) New values: party, presence, set point range, program set point, offset, `HEATING`, `LOWBAT`, `UNREACH`,
  firmware, error counter, relay, cooling, ECO input, frost protection, cloud state
- (djlex83) Checked writing with whitelist, ranges and quarter hours; only the last value of a quick series is sent
- (djlex83) Cloud credentials, network settings and codes are no longer read
- (djlex83) Objects are extended instead of replaced (keeps history settings); state IDs and types unchanged
- (djlex83) JSON config, current adapter-core, tests with a simulated base station, no `request`/`xml2js`

### 1.0.4

- (bigluke26) Added PUMP status issue #26

### 1.0.3

- (Eisbaeeer) Fixed error messages in log

### 1.0.2

- (oHa510) Heat areas and actuators up to 12, indexing 1–12, child lock, hotel mode, room units

### 1.0.1 and older

- (Eisbaeeer) Initial versions

## License

The MIT License (MIT)

Copyright (c) 2026 djlex83 <djlex83@users.noreply.github.com>
Copyright (c) 2018-2021 Eisbaeeer <eisbaeeer@gmail.com>

See [LICENSE](LICENSE). Möhlenhoff and Alpha 2 are trademarks of their owners; this project is not
affiliated with Möhlenhoff GmbH.
