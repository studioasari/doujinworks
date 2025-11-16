import { supabase } from '@/utils/supabase'

/**
 * 2人のユーザー間のチャットルームを取得または作成する
 * @param currentUserId 現在のユーザーID
 * @param otherUserId 相手のユーザーID
 * @returns チャットルームID
 */
export async function getOrCreateChatRoom(
  currentUserId: string,
  otherUserId: string
): Promise<string | null> {
  try {
    // 既存のチャットルームを検索
    const { data: existingParticipations } = await supabase
      .from('chat_room_participants')
      .select('chat_room_id')
      .eq('user_id', currentUserId)

    if (existingParticipations && existingParticipations.length > 0) {
      const roomIds = existingParticipations.map(p => p.chat_room_id)

      // これらのルームで相手も参加しているものを探す
      const { data: otherUserRooms } = await supabase
        .from('chat_room_participants')
        .select('chat_room_id')
        .eq('user_id', otherUserId)
        .in('chat_room_id', roomIds)

      if (otherUserRooms && otherUserRooms.length > 0) {
        // 既存のチャットルームが見つかった
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
        { chat_room_id: newRoom.id, user_id: currentUserId },
        { chat_room_id: newRoom.id, user_id: otherUserId }
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