package com.tecladomaster.app.midi

import android.content.Context
import android.media.midi.*
import android.os.Handler
import android.os.Looper

data class MidiNoteEvent(val note: Int, val pressed: Boolean, val velocity: Int)
data class MidiDeviceState(val id: Int, val name: String, val connected: Boolean)

/** Native Android USB/Bluetooth MIDI input using MidiManager and real device ports. */
class MidiRecognizer(
    context: Context,
    private val onNote: (MidiNoteEvent) -> Unit,
    private val onDevices: (List<MidiDeviceState>) -> Unit,
) {
    private val manager = context.getSystemService(Context.MIDI_SERVICE) as? MidiManager
    private val openDevices = mutableMapOf<Int, MidiDevice>()
    private val ports = mutableListOf<MidiInputPort>()
    private val receiver = object : MidiReceiver() {
        override fun onSend(msg: ByteArray, offset: Int, count: Int, timestamp: Long) {
            if (count < 3) return
            val status = msg[offset].toInt() and 0xff
            val command = status and 0xf0
            val note = msg[offset + 1].toInt() and 0x7f
            val velocity = msg[offset + 2].toInt() and 0x7f
            when {
                command == 0x90 && velocity > 0 -> onNote(MidiNoteEvent(note, true, velocity))
                command == 0x80 || (command == 0x90 && velocity == 0) -> onNote(MidiNoteEvent(note, false, 0))
                command == 0xb0 && note == 123 -> repeat(128) { onNote(MidiNoteEvent(it, false, 0)) }
            }
        }
    }
    private val callback = object : MidiManager.DeviceCallback() {
        override fun onDeviceAdded(device: MidiDeviceInfo) { open(device) }
        override fun onDeviceRemoved(device: MidiDeviceInfo) {
            close(device.id)
            repeat(128) { onNote(MidiNoteEvent(it, false, 0)) }
            publishDevices()
        }
    }

    fun start() {
        val midi = manager ?: run { onDevices(emptyList()); return }
        midi.registerDeviceCallback(callback, Handler(Looper.getMainLooper()))
        midi.devices.forEach(::open)
    }

    private fun open(info: MidiDeviceInfo) {
        if (openDevices.containsKey(info.id)) return
        manager?.openDevice(info, { device ->
            if (device == null) return@openDevice
            openDevices[info.id] = device
            info.ports.filter { it.type == MidiDeviceInfo.PortInfo.TYPE_OUTPUT }.forEach { port ->
                runCatching {
                    val inputPort = device.openOutputPort(port.portNumber)
                    if (inputPort != null) { inputPort.connect(receiver); ports.add(inputPort) }
                }
            }
            publishDevices()
        }, Handler(Looper.getMainLooper()))
    }

    private fun publishDevices() {
        val devices = manager?.devices?.map { info ->
            val name = info.properties.getString(MidiDeviceInfo.PROPERTY_NAME) ?: "USB MIDI ${info.id}"
            MidiDeviceState(info.id, name, openDevices.containsKey(info.id))
        }.orEmpty()
        onDevices(devices)
    }

    private fun close(id: Int) { openDevices.remove(id)?.close() }
    fun close() {
        manager?.unregisterDeviceCallback(callback)
        ports.forEach { runCatching { it.close() } }; ports.clear()
        openDevices.values.forEach { runCatching { it.close() } }; openDevices.clear()
        onDevices(emptyList())
    }
}
