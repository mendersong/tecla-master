package com.tecladomaster.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.core.content.ContextCompat
import com.tecladomaster.app.ui.MasterApp
import com.tecladomaster.app.viewmodel.MasterViewModel

class MainActivity : ComponentActivity() {
    private val model: MasterViewModel by viewModels()
    private val microphonePermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) model.startMicrophone()
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MasterApp(model) { requestMicrophone() } }
    }
    private fun requestMicrophone() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) model.startMicrophone()
        else microphonePermission.launch(Manifest.permission.RECORD_AUDIO)
    }
    override fun onDestroy() { if (isFinishing) model.stopMicrophone(); super.onDestroy() }
}
