import { supabase } from '@/utils/supabase'

/**
 * 2人のユーザー間のチャットルームを取得または作成する
 * @param currentProfileId 現在のユーザーのプロフィールID (profiles.id)
 * @param otherProfileId 相手のユーザーのプロフィールID (profiles.id)
 * @returns チャットルームID
 */
export async function getOrCreateChatRoom(
  currentProfileId: string,
  otherProfileId: string
): Promise<string | null> {
  try {
    // 既存のチャットルームを検索
    const { data: existingParticipations, error: existingError } = await supabase
      .from('chat_room_participants')
      .select('chat_room_id')
      .eq('user_id', currentProfileId)

    if (existingError) {
      console.error('チャットルーム検索エラー:', existingError)
      return null
    }

    if (existingParticipations && existingParticipations.length > 0) {
      const roomIds = existingParticipations.map(p => p.chat_room_id)

      // これらのルームで相手も参加しているものを探す
      const { data: otherUserRooms, error: otherError } = await supabase
        .from('chat_room_participants')
        .select('chat_room_id')
        .eq('user_id', otherProfileId)
        .in('chat_room_id', roomIds)

      if (otherError) {
        console.error('相手の参加ルーム検索エラー:', otherError)
        return null
      }

      if (otherUserRooms && otherUserRooms.length > 0) {
        return otherUserRooms[0].chat_room_id
      }
    }

    // 新しいチャットルームを作成
    const { data: newRoom, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({})
      .select()
      .single()

    if (roomError || !newRoom) {
      console.error('チャットルーム作成エラー:', roomError)
      return null
    }

    // 参加者を追加
    const { error: participantsError } = await supabase
      .from('chat_room_participants')
      .insert([
        { chat_room_id: newRoom.id, user_id: currentProfileId },
        { chat_room_id: newRoom.id, user_id: otherProfileId }
      ])

    if (participantsError) {
      console.error('参加者追加エラー:', participantsError)
      return null
    }

    return newRoom.id
  } catch (error) {
    console.error('チャットルーム取得/作成エラー:', error)
    return null
  }
}