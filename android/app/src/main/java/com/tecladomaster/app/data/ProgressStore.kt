package com.tecladomaster.app.data

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "profile")
data class ProfileEntity(
    @PrimaryKey val id: Int = 1, val name: String = "Músico", val language: String = "pt-BR",
    val theme: String = "nebula", val xp: Int = 0, val practiceSeconds: Long = 0,
    val lastLessonId: String? = null, val micSensitivity: Float = .62f, val noiseGate: Float = .18f,
    val inputMode: String = "auto", val soundVolume: Float = .7f,
)

@Entity(tableName = "exercise_results")
data class ExerciseEntity(
    @PrimaryKey val id: String, val lessonId: String, val level: Int, val errors: Int,
    val durationSec: Float, val attempts: Int, val stars: Int, val xp: Int, val accuracy: Float, val completedAt: Long,
)

@Entity(tableName = "assessment_results")
data class AssessmentEntity(
    @PrimaryKey val id: String, val level: Int, val grade: Float, val accuracy: Float,
    val sequenceScore: Float, val changeScore: Float, val timingScore: Float,
    val errors: Int, val durationSec: Float, val passed: Boolean, val completedAt: Long,
)

@Dao interface ProgressDao {
    @Query("SELECT * FROM profile WHERE id = 1") fun profile(): Flow<ProfileEntity?>
    @Query("SELECT * FROM profile WHERE id = 1") suspend fun profileNow(): ProfileEntity?
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun saveProfile(profile: ProfileEntity)
    @Query("SELECT * FROM exercise_results ORDER BY completedAt DESC") fun exercises(): Flow<List<ExerciseEntity>>
    @Query("SELECT * FROM assessment_results ORDER BY completedAt DESC") fun assessments(): Flow<List<AssessmentEntity>>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun addExercise(result: ExerciseEntity)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun addAssessment(result: AssessmentEntity)
    @Transaction suspend fun saveExercise(result: ExerciseEntity, elapsed: Long) {
        addExercise(result)
        val current = profileNow() ?: ProfileEntity()
        saveProfile(current.copy(xp = current.xp + result.xp, practiceSeconds = current.practiceSeconds + elapsed, lastLessonId = result.lessonId))
    }
    @Transaction suspend fun saveAssessment(result: AssessmentEntity, elapsed: Long) {
        addAssessment(result)
        val current = profileNow() ?: ProfileEntity()
        saveProfile(current.copy(xp = current.xp + if (result.passed) result.level * 120 else 25, practiceSeconds = current.practiceSeconds + elapsed))
    }
}

@Database(entities = [ProfileEntity::class, ExerciseEntity::class, AssessmentEntity::class], version = 1, exportSchema = true)
abstract class MasterDatabase : RoomDatabase() {
    abstract fun dao(): ProgressDao
    companion object {
        @Volatile private var instance: MasterDatabase? = null
        fun get(context: Context): MasterDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(context.applicationContext, MasterDatabase::class.java, "teclado-master.db")
                .fallbackToDestructiveMigration().build().also { instance = it }
        }
    }
}
