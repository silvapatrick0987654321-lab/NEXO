


import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  ScrollView, Image, ActivityIndicator, Alert, StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { createClient } from '@supabase/supabase-js';
import { Video } from 'expo-av';
import { Audio } from 'expo-av';
import { useVideoPlayer, VideoView } from 'expo-video';

const SUPABASE_URL = 'https://tkovoisqiyjkkfcxgawy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9sXmI_lv801FwA9q0kLAlg_NwKACO5b';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

const BUCKET_POSTS = 'posts';
const BUCKET_AVATARS = 'avatars';
const BUCKET_STORIES = 'stories';

export default function App() {
 function ReelVideo({ post }) {
  const player = useVideoPlayer(post.media_url, player => {
    player.loop = true;
    player.play();
  });

  return (
    <View style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
      justifyContent: 'center'
    }}>
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        nativeControls={false}
      />

      <View style={{
        position: 'absolute',
        bottom: 50,
        left: 15
      }}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
          @{post.author?.username || 'usuario'}
        </Text>
        <Text style={{ color: '#fff', marginTop: 8 }}>
          {post.caption}
        </Text>
      </View>
    </View>
  );
}
  const [session, setSession] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [booting, setBooting] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authName, setAuthName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('Início');
  const [busy, setBusy] = useState(false);

  const [profile, setProfile] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState(null);
  const [editing, setEditing] = useState(false);
  const [profileTarget, setProfileTarget] = useState(null);

  const [posts, setPosts] = useState([]);
  const [newMedia, setNewMedia] = useState(null);
  const [caption, setCaption] = useState('');

  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] =useState (null);
  const [storyReply, setStoryReply] = useState('');
const [sendingStoryReply, setSendingStoryReply] = useState(false);
  const [storyViewsCount, setStoryViewsCount] = useState(0);
  const [storyViewers, setStoryViewers] = useState([]);
const [showStoryViewers, setShowStoryViewers] = useState(false);
  useEffect(() => {
  async function loadStoryViews() {
    if (!selectedStory?.id || selectedStory.user_id !== session?.user?.id) {
      setStoryViewsCount(0);
      setStoryViewers([]);
      return;
    }

    const { data, error } = await supabase
      .from('story_views')
      .select('viewer_id')
      .eq('story_id', selectedStory.id);

    if (error) {
      console.log('Erro ao carregar visualizações:', error.message);
      return;
    }

    const ids = [...new Set((data || []).map(v => v.viewer_id))];

    if (ids.length === 0) {
      setStoryViewsCount(0);
      setStoryViewers([]);
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', ids);

    if (profileError) {
      console.log('Erro nos perfis:', profileError.message);
      return;
    }

    setStoryViewers(ids.map(id => ({
      viewer_id: id,
      profiles: profiles?.find(p => p.id === id)
    })));

    setStoryViewsCount(ids.length);
  }

  loadStoryViews();
}, [selectedStory, session?.user?.id]);

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [following, setFollowing] = useState([]);

  const [commentsFor, setCommentsFor] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  const [messages, setMessages] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [people, setPeople] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setBooting(false);
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next);
      });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      refreshAll();
    }
  }, [session?.user?.id]);

  async function refreshAll() {
    if (!session?.user?.id) return;

    await Promise.all([
      loadProfile(),
      loadPosts(),
      loadStories(),
      loadFollowing(),
      loadPeople(),
      loadNotifications()
    ]);
  }

  async function loadNotifications() {
    if (!session?.user?.id) {
      setNotifications([]);
      setUnreadNotifications(0);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id,user_id,actor_id,type,post_id,message,is_read,created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.log('Erro ao carregar notificações:', error.message);
        Alert.alert('Erro nas notificações', error.message);
        return;
      }

      const rows = data || [];
      const actorIds = [...new Set(rows.map(item => item.actor_id).filter(Boolean))];
      let actorProfiles = [];

      if (actorIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id,display_name,username,bio,avatar_url,is_premium,is_admin')
          .in('id', actorIds);

        if (profilesError) {
          console.log('Erro ao carregar autores das notificações:', profilesError.message);
        } else {
          actorProfiles = profilesData || [];
        }
      }

      const completeRows = rows.map(item => ({
        ...item,
        actor: actorProfiles.find(profile => profile.id === item.actor_id) || null
      }));

      setNotifications(completeRows);
      setUnreadNotifications(completeRows.filter(item => !item.is_read).length);
    } catch (error) {
      console.log('Falha ao carregar notificações:', error?.message);
      Alert.alert(
        'Erro nas notificações',
        error?.message || 'Não foi possível carregar as notificações.'
      );
    }
  }

  async function markNotificationRead(notification) {
    if (!notification || notification.is_read) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id)
      .eq('user_id', session.user.id);

    if (error) {
      console.log('Erro ao marcar notificação como lida:', error.message);
      return;
    }

    setNotifications(old =>
      old.map(item =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );
    setUnreadNotifications(old => Math.max(0, old - 1));
  }

  function fallbackUsername(value) {
    return (
      (value || 'usuario')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, '')
        .slice(0, 20) || 'usuario'
    );
  }

  async function loadProfile() {
  

    const { data, error } = await supabase
      .from('profiles')
      .select('id,display_name,username,bio,avatar_url,is_premium,is_admin')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.log('profile', error.message);
      return;
    }

    const display =
      session.user.user_metadata?.name ||
      session.user.email?.split('@')[0] ||
      'Usuário';

    const p = data || {
      id: session.user.id,
      display_name: display,
      username: fallbackUsername(display),
      bio: '',
      avatar_url: null
    };

    setProfile(p);
    setEditName(p.display_name || display);
    setEditUsername(p.username || fallbackUsername(display));
    setEditBio(p.bio || '');
  }
async function loadAdminUsers() {
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, is_premium')
    .order('username');

  if (error) {
    Alert.alert('Erro', error.message);
    return;
  }

  setAdminUsers(data || []);
  }
  async function toggleAdminPremium(user) {
  const { error } = await supabase.rpc('admin_set_premium', {
    target_user: user.id,
    premium_status: !user.is_premium
  });

  if (error) {
    Alert.alert('Erro', error.message);
    return;
  }

  Alert.alert('NEXO Premium', 'Status atualizado com sucesso!');
  loadAdminUsers();
}
  async function uploadAsset(uri, bucket, prefix, mimeType) {
    const response = await fetch(uri);
    const body = await response.arrayBuffer();
    const ext = (uri.split('.').pop() || 'jpg')
      .split('?')[0]
      .toLowerCase();

    const path =
      `${session.user.id}/${prefix}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, body, {
        contentType:
          mimeType ||
          (ext === 'png'
            ? 'image/png'
            : ext === 'mp4'
            ? 'video/mp4'
            : 'image/jpeg'),
        upsert: false
      });

    if (error) throw error;

    return supabase.storage
      .from(bucket)
      .getPublicUrl(path).data.publicUrl;
  }

  async function pickImage(setter, video = false) {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permissão necessária',
        'Autorize o acesso à galeria do celular.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: video ? ['images', 'videos'] : ['images'],
      allowsEditing: !video,
      aspect: [1, 1],
      quality: 0.85,
      videoMaxDuration: 60
    });

    if (!result.canceled && result.assets?.[0]) {
      setter(result.assets[0]);
    }
  }

  async function saveProfile() {
    const username = editUsername
      .trim()
      .replace(/^@/, '')
      .toLowerCase();

    if (!editName.trim()) {
      return Alert.alert('Informe seu nome.');
    }

    if (!/^[a-z0-9._]{3,20}$/.test(username)) {
      return Alert.alert(
        '@ inválido',
        'Use 3 a 20 caracteres: letras, números, ponto ou underline.'
      );
    }

    setBusy(true);

    try {
      let avatar_url = profile?.avatar_url || null;

      if (editAvatar?.uri) {
        avatar_url = await uploadAsset(
          editAvatar.uri,
          BUCKET_AVATARS,
          'avatar',
          editAvatar.mimeType
        );
      }

      const row = {
        id: session.user.id,
        display_name: editName.trim(),
        username,
        bio: editBio.trim(),
        avatar_url,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(row, { onConflict: 'id' });

      if (error) throw error;

      setProfile(row);
      setEditAvatar(null);
      setEditing(false);

      Alert.alert(
        'Perfil atualizado',
        'Suas informações foram salvas.'
      );
    } catch (e) {
      Alert.alert('Erro ao salvar perfil', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) {
      console.log('posts', error.message);
      return;
    }

    const ids = [...new Set((data || []).map(x => x.user_id))];
    let profs = [];

    if (ids.length) {
      const r = await supabase
        .from('profiles')
        .select('id,display_name,username,avatar_url,is_premium')
        .in('id', ids);

      profs = r.data || [];
    }

    const postIds = (data || []).map(x => x.id);
    let likedIds = [];

    if (postIds.length) {
      const r = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', session.user.id)
        .in('post_id', postIds);

      likedIds = (r.data || []).map(x => x.post_id);
    }

    setPosts((data || []).map(x => ({
      ...x,
      author: profs.find(p => p.id === x.user_id),
      liked: likedIds.includes(x.id)
    })));
  }
async function deletePost(post) {
  if (!session?.user?.id || post.user_id !== session.user.id) {
    window.alert('Você só pode apagar suas próprias publicações.');
    return;
  }

  if (!window.confirm('Tem certeza que deseja apagar esta publicação?')) {
    return;
  }

  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id)
      .eq('user_id', session.user.id);

    if (error) throw error;

    setPosts(old => old.filter(p => p.id !== post.id));

    const marker = '/storage/v1/object/public/posts/';
    const mediaUrl = post.media_url || '';
    const path = mediaUrl.includes(marker)
      ? mediaUrl.split(marker)[1].split('?')[0]
      : null;

    if (path) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_POSTS)
        .remove([decodeURIComponent(path)]);

      if (storageError) {
        console.log('Erro ao remover arquivo:', storageError.message);
      }
    }

    window.alert('Publicação apagada com sucesso!');
  } catch (error) {
    console.log('Erro ao apagar publicação:', error.message);
    window.alert('Não foi possível apagar: ' + error.message);
  }
}
  async function publishPost() {
    if (!newMedia?.uri) {
      return Alert.alert('Escolha uma foto ou vídeo.');
    }

    setBusy(true);

    try {
      const isVideo = newMedia.type === 'video';

      const url = await uploadAsset(
        newMedia.uri,
        BUCKET_POSTS,
        'post',
        newMedia.mimeType
      );

      const { error } = await supabase.from('posts').insert({
        user_id: session.user.id,
        caption: caption.trim(),
        media_url: url,
        media_type: isVideo ? 'video' : 'image'
      });

      if (error) throw error;

      setNewMedia(null);
      setCaption('');
      await loadPosts();
      setTab('Início');

      Alert.alert(
        'Publicado!',
        'Sua publicação já está no feed.'
      );
    } catch (e) {
      Alert.alert('Erro ao publicar', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike(post) {
    const wasLiked = post.liked;

    setPosts(old =>
      old.map(p =>
        p.id === post.id
          ? { ...p, liked: !wasLiked }
          : p
      )
    );

    const result = wasLiked
      ? await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', session.user.id)
      : await supabase.from('post_likes').insert({
          post_id: post.id,
          user_id: session.user.id
        });

    if (result.error) {
      Alert.alert(
        'Não foi possível curtir',
        result.error.message
      );
      loadPosts();
    }
  }

  async function openComments(post) {
    setCommentsFor(post);
    setComments([]);
    setCommentText('');

    const { data, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (error) {
      return Alert.alert('Comentários', error.message);
    }

    const ids = [...new Set((data || []).map(x => x.user_id))];
    let profs = [];

    if (ids.length) {
      const r = await supabase
        .from('profiles')
        .select('id,username,display_name,avatar_url')
        .in('id', ids);

      profs = r.data || [];
    }

    setComments((data || []).map(x => ({
      ...x,
      author: profs.find(p => p.id === x.user_id)
    })));
  }

  async function sendComment() {
    if (!commentText.trim() || !commentsFor) return;

    const { error } = await supabase
      .from('post_comments')
      .insert({
        post_id: commentsFor.id,
        user_id: session.user.id,
        content: commentText.trim()
      });

    if (error) {
      return Alert.alert('Erro', error.message);
    }

    setCommentText('');
    openComments(commentsFor);
  }

  async function loadStories() {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.log('stories', error.message);
      return;
    }

    const ids = [...new Set((data || []).map(x => x.user_id))];
    let profs = [];

    if (ids.length) {
      const r = await supabase
        .from('profiles')
        .select('id,username,display_name,avatar_url')
        .in('id', ids);

      profs = r.data || [];
    }

    setStories((data || []).map(x => ({
      ...x,
      author: profs.find(p => p.id === x.user_id)
    })));
  }

  async function createStory() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return Alert.alert(
        'Permissão necessária',
        'Autorize o acesso à galeria do celular.'
      );
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    setBusy(true);

    try {
      const url = await uploadAsset(
        asset.uri,
        BUCKET_STORIES,
        'story',
        asset.mimeType
      );

      const { error } = await supabase.from('stories').insert({
        user_id: session.user.id,
        media_url: url,
        expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString()
      });

      if (error) throw error;

      await loadStories();
      Alert.alert('Story publicado!');
    } catch (e) {
      Alert.alert('Erro ao publicar story', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadFollowing() {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', session.user.id);

    if (!error) {
      setFollowing((data || []).map(x => x.following_id));
    }
  }

  async function loadPeople() {
    const { data } = await supabase
      .from('profiles')
      .select('id,display_name,username,bio,avatar_url')
      .neq('id', session.user.id)
      .limit(50);

    setPeople(data || []);
  }

  async function searchPeople() {
    const q = searchText.trim().replace(/^@/, '');

    if (!q) return loadPeople();

    const { data, error } = await supabase
      .from('profiles')
      .select('id,display_name,username,bio,avatar_url')
      .neq('id', session.user.id)
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(30);

    if (error) {
      return Alert.alert('Erro na busca', error.message);
    }

    setSearchResults(data || []);
  }

  async function toggleFollow(userId) {
    const isFollowing = following.includes(userId);

    const result = isFollowing
      ? await supabase
          .from('follows')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', userId)
      : await supabase.from('follows').insert({
          follower_id: session.user.id,
          following_id: userId
        });

    if (result.error) {
      return Alert.alert(
        'Erro ao atualizar',
        result.error.message
      );
    }

    setFollowing(old =>
      isFollowing
        ? old.filter(x => x !== userId)
        : [...old, userId]
    );
  }

  async function loadConversations() {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(
        `user_one_id.eq.${session.user.id},user_two_id.eq.${session.user.id}`
      )
      .order('created_at', { ascending: false });

    if (error) {
      return Alert.alert('Mensagens', error.message);
    }

    const ids = (data || []).map(c =>
      c.user_one_id === session.user.id
        ? c.user_two_id
        : c.user_one_id
    );

    let profs = [];

    if (ids.length) {
      const r = await supabase
        .from('profiles')
        .select('id,username,display_name,avatar_url')
        .in('id', ids);

      profs = r.data || [];
    }

    setPeople(profs.map(p => ({
      ...p,
      conversation: data.find(c =>
        c.user_one_id === p.id || c.user_two_id === p.id
      )
    })));
  }

  
async function openChat(person) {
  if (!session?.user?.id || !person?.id) {
    return Alert.alert('Direct', 'Não foi possível identificar os usuários.');
  }

  try {
    const a = session.user.id;
    const b = person.id;
    let conversation = person.conversation || null;

    if (!conversation) {
      const { data: existing, error: searchError } = await supabase
        .from('conversations')
        .select('*')
        .or(
          `and(user_one_id.eq.${a},user_two_id.eq.${b}),and(user_one_id.eq.${b},user_two_id.eq.${a})`
        )
        .maybeSingle();

      if (searchError) throw searchError;

      conversation = existing;

      if (!conversation) {
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            user_one_id: a,
            user_two_id: b
          })
          .select()
          .single();

        if (error) throw error;
        conversation = data;
      }
    }

    setActiveConversation({
  ...conversation,
  person
});

setSelectedStory(null);
setTab('Mensagens');

await loadMessages(conversation.id);
  } catch (error) {
    Alert.alert('Erro ao abrir Direct', error.message);
  }
}

  

  async function loadMessages(conversationId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return Alert.alert('Mensagens', error.message);
    }

    setMessages(data || []);
  }
  async function startAudioRecording() {
  try {
    const permission = await Audio.requestPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permissão', 'Autorize o uso do microfone.');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true
    });

    const result = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    setRecording(result.recording);
  } catch (error) {
    Alert.alert('Erro ao gravar', error.message);
  }
}

async function stopAndSendAudio() {
  try {
    if (!recording || !activeConversation) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    if (!uri) return;

    const audioUrl = await uploadAsset(
      uri,
      'audio',
      'voice',
      'audio/m4a'
    );

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConversation.id,
        sender_id: session.user.id,
        content: '🎤 Mensagem de áudio',
        media_url: audioUrl,
        media_type: 'audio'
      });

    if (error) throw error;

    await loadMessages(activeConversation.id);
    Alert.alert('Áudio enviado', 'Sua mensagem foi enviada!');
  } catch (error) {
    setRecording(null);
    Alert.alert('Erro ao enviar áudio', error.message);
  }
}
  async function sendMessage() {
    if (!messageText.trim() || !activeConversation) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConversation.id,
        sender_id: session.user.id,
        content: messageText.trim()
      });

    if (error) {
      return Alert.alert('Erro ao enviar', error.message);
    }

    setMessageText('');
    loadMessages(activeConversation.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setTab('Início');
  }

  async function handleAuth() {
    if (!email.trim() || password.length < 6) {
      return Alert.alert(
        'Confira os dados',
        'Informe um e-mail e senha com pelo menos 6 caracteres.'
      );
    }

    setBusy(true);

    try {
      if (authMode === 'signup') {
        if (!authName.trim()) {
          throw new Error('Informe seu nome.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: authName.trim() }
          }
        });

        if (error) throw error;

        if (!data.session) {
          Alert.alert(
            'Confirme seu e-mail',
            'Depois da confirmação, entre na sua conta.'
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;
      }
    } catch (e) {
      Alert.alert('Acesso', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function openPublicProfile(person) {
    const { data: userPosts } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', person.id)
      .order('created_at', { ascending: false });

    setProfileTarget({
      ...person,
      posts: userPosts || []
    });
  }

  if (booting) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={s.muted}>Carregando NEXO...</Text>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={s.auth}>
        <Text style={s.logo}>NEXO.</Text>
        <Text style={s.tagline}>
          Conecte-se com o que importa.
        </Text>

        {authMode === 'signup' && (
          <TextInput
            style={s.input}
            placeholder="Seu nome"
            value={authName}
            onChangeText={setAuthName}
          />
        )}

        <TextInput
          style={s.input}
          placeholder="E-mail"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={s.input}
          placeholder="Senha (mínimo 6 caracteres)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={s.primary}
          onPress={handleAuth}
          disabled={busy}
        >
          <Text style={s.primaryText}>
            {busy
              ? 'AGUARDE...'
              : authMode === 'signup'
              ? 'CRIAR CONTA'
              : 'ENTRAR'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            setAuthMode(
              authMode === 'signup' ? 'login' : 'signup'
            )
          }
        >
          <Text style={s.link}>
            {authMode === 'signup'
              ? 'Já tenho conta · Entrar'
              : 'Criar uma conta'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const Header = () => (
  <View style={s.header}>
    <Text style={s.headerLogo}>NEXO.</Text>

    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <TouchableOpacity onPress={() => setTab('Mensagens')}>
        <Text style={s.headerAction}>✉</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => {
        setTab('Notificações');
        loadNotifications();
      }}>
        <Text style={s.headerAction}>🔔</Text>
      </TouchableOpacity>
    </View>
  </View>
);

  const avatar = (p, size = 42) =>
    p?.avatar_url ? (
      <Image
        source={{ uri: p.avatar_url }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#eee'
        }}
      />
    ) : (
      <View
        style={[
          s.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2
          }
        ]}
      >
        <Text style={s.avatarText}>
          {(p?.display_name || 'N').charAt(0).toUpperCase()}
        </Text>
      </View>
    );

  const renderStories = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.storyStrip}>
      <TouchableOpacity style={s.storyItem} onPress={createStory}>
        <View style={s.storyRing}>
          <Text style={s.storyPlus}>＋</Text>
        </View>
        <Text style={s.storyLabel}>Seu story</Text>
      </TouchableOpacity>

      {stories.map(st => (
        <TouchableOpacity
          key={st.id}
          style={s.storyItem}
          onPress={async () => {
  setSelectedStory(st);

  if (session?.user?.id && st?.id && st.user_id !== session.user.id) {
    const { error } = await supabase
      .from('story_views')
      .upsert(
        {
          story_id: st.id,
          viewer_id: session.user.id
        },
        {
          onConflict: 'story_id,viewer_id',
          ignoreDuplicates: true
        }
      );

    if (error) {
      Alert.alert('Erro ao registrar visualização', error.message);
    }
  }
}}>
          {avatar(st.author, 58)}
          <Text style={s.storyLabel}>
            @{st.author?.username || 'pessoa'}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderFeed = () => (
    <ScrollView>
      {renderStories()}

      {posts.length === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Seu feed começa aqui</Text>
          <Text style={s.muted}>
            Publique uma foto ou encontre pessoas para seguir.
          </Text>
        </View>
      )}

      {posts.map(post => (
        <View key={post.id} style={s.post}>
          <View style={s.postHead}>
            <TouchableOpacity onPress={() => openPublicProfile(post.author)}>
  {avatar(post.author)}
</TouchableOpacity>

            <TouchableOpacity
  style={{ flex: 1 }}
  onPress={() => openPublicProfile(post.author)}
>>
              <Text style={s.bold}>
                @{post.author?.username || 'usuario'}
{post.author?.is_premium && (
  <Text style={{ color: '#1D9BF0', fontWeight: 'bold' }}> ✓</Text>
)}
              </Text>
              <Text style={s.mutedSmall}>
                {post.author?.display_name || 'NEXO'}
              </Text>
            </TouchableOpacity>

            {post.user_id === session.user.id && (
  <TouchableOpacity onPress={() => deletePost(post)}>
    <Text style={{ color: '#d32f2f', fontSize: 18 }}>
      🗑️
    </Text>
  </TouchableOpacity>
)}
          </View>

          {post.media_type === 'image' ? (
            <Image
              source={{ uri: post.media_url }}
              style={s.postImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[s.postImage, s.videoPlaceholder]}>
              <Text style={s.bold}>▶ Vídeo</Text>
              <Text style={s.mutedSmall}>
                Vídeo armazenado no NEXO
              </Text>
            </View>
          )}

          <View style={s.postActions}>
            <TouchableOpacity onPress={() => toggleLike(post)}>
              <Text style={s.action}>
                {post.liked ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openComments(post)}>
              <Text style={s.action}>◯</Text>
            </TouchableOpacity>

            <Text style={s.action}>↗</Text>
          </View>

          {!!post.caption && (
            <Text style={s.caption}>
              <Text style={s.bold}>
                @{post.author?.username || 'usuario'}{' '}
              </Text>
              {post.caption}
            </Text>
          )}

          <TouchableOpacity onPress={() => openComments(post)}>
            <Text style={s.mutedSmall}>
              Ver / adicionar comentários
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
const renderReels = () => {
  const reels = posts.filter(post => post.media_type === 'video');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#000' }}
      pagingEnabled
      showsVerticalScrollIndicator={false}
    >
      {reels.length === 0 ? (
        <View style={{
          height: 600,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ color: '#fff', fontSize: 20 }}>
            🎬 Ainda não há Reels
          </Text>
          <Text style={{ color: '#aaa', marginTop: 10 }}>
            Publique um vídeo para começar!
          </Text>
        </View>
      ) : (
        reels.map(post => (
          <View key={post.id} style={{ height: 650 }}>
            <ReelVideo post={post} />
          </View>
        ))
      )}
    </ScrollView>
  );
};
  const renderPublish = () => (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.pageTitle}>Nova publicação</Text>

      <TouchableOpacity
        style={s.mediaPicker}
        onPress={() => pickImage(setNewMedia, true)}
      >
        {newMedia?.uri ? (
          <Image
            source={{ uri: newMedia.uri }}
            style={s.preview}
          />
        ) : (
          <>
            <Text style={s.plusLarge}>＋</Text>
            <Text style={s.bold}>Escolher foto ou vídeo</Text>
            <Text style={s.mutedSmall}>
              Até 60 segundos para vídeos
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TextInput
        style={[s.input, s.multiline]}
        placeholder="Escreva uma legenda..."
        value={caption}
        onChangeText={setCaption}
        multiline
      />

      <TouchableOpacity
        style={s.primary}
        onPress={publishPost}
        disabled={busy}
      >
        <Text style={s.primaryText}>
          {busy ? 'PUBLICANDO...' : 'PUBLICAR'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderSearch = () => (
    <View style={s.page}>
      <Text style={s.pageTitle}>Explorar pessoas</Text>

      <View style={s.searchRow}>
        <TextInput
          style={[s.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Buscar por nome ou @usuário"
          value={searchText}
          onChangeText={setSearchText}
        />

        <TouchableOpacity
          style={s.searchButton}
          onPress={searchPeople}
        >
          <Text style={s.primaryText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {(searchResults.length ? searchResults : people).map(person => (
          <View key={person.id} style={s.personRow}>
            {avatar(person)}

            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => openPublicProfile(person)}
            >
              <Text style={s.bold}>{person.display_name}</Text>
              <Text style={s.mutedSmall}>@{person.username}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.followButton}
              onPress={() => toggleFollow(person.id)}
            >
              <Text style={s.followText}>
                {following.includes(person.id) ? 'Seguindo' : 'Seguir'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openChat(person)}>
              <Text style={s.action}>✉</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
    const renderProfile = () =>
    editing ? (
      <ScrollView contentContainerStyle={s.page}>
        <Text style={s.pageTitle}>Editar perfil</Text>
⁷
        <TouchableOpacity
          style={s.avatarEdit}
          onPress={() => pickImage(setEditAvatar)}
        >
          {editAvatar?.uri ? (
            <Image
              source={{ uri: editAvatar.uri }}
              style={s.bigAvatar}
            />
          ) : (
            avatar(profile, 100)
          )}
          <Text style={s.link}>Alterar foto</Text>
        </TouchableOpacity>

        <Text style={s.label}>Nome</Text>
        <TextInput
          style={s.input}
          value={editName}
          onChangeText={setEditName}
        />

        <Text style={s.label}>Nome de usuário</Text>
        <TextInput
          style={s.input}
          value={editUsername}
          onChangeText={setEditUsername}
          autoCapitalize="none"
        />

        <Text style={s.label}>Biografia</Text>
        <TextInput
          style={[s.input, s.multiline]}
          value={editBio}
          onChangeText={setEditBio}
          multiline
          maxLength={160}
          placeholder="Conte um pouco sobre você"
        />

        <TouchableOpacity
          style={s.primary}
          onPress={saveProfile}
          disabled={busy}
        >
          <Text style={s.primaryText}>
            {busy ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setEditing(false)}>
          <Text style={s.link}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    ) : (
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.profileTop}>
          {avatar(profile, 88)}

          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>
              {profile?.display_name || 'Seu perfil'}
              {profile?.is_premium && (
  <Text style={{ color: '#2685EA', fontWeight: 'bold', fontSize: 14 }}>
    ✓ NEXO PREMIUM
  </Text>
)}
            </Text>
            <Text style={s.muted}>
              @{profile?.username || 'usuario'}
            </Text>
            <Text style={s.mutedSmall}>
              Publicações:{' '}
              {posts.filter(p => p.user_id === session.user.id).length}
            </Text>
          </View>
        </View>

        <Text style={s.bio}>
          {profile?.bio || 'Adicione uma biografia ao seu perfil.'}
        </Text>

        <TouchableOpacity
  onPress={() => Alert.alert(
    'NEXO PREMIUM 💎',
    'Tenha acesso a todos os benefícios Premium por apenas R$ 9,90 por mês. Em breve você poderá assinar!'
  )}
  style={{
    backgroundColor: '#EEF5FF',
    borderWidth: 1.5,
    borderColor: '#2685EA',
    borderRadius: 18,
    padding: 18,
    marginBottom: 15
  }}
>
  <Text style={{ color: '#2685EA', fontSize: 17, fontWeight: 'bold' }}>
    💎 Conheça o NEXO Premium
  </Text>
  <Text style={{ color: '#333', marginTop: 6 }}>
    Todos os benefícios por R$ 9,90/mês
  </Text>
  <Text style={{ color: '#2685EA', marginTop: 8, fontWeight: 'bold' }}>
    SAIBA MAIS →
  </Text>
</TouchableOpacity>

{profile?.is_admin && (
  <View style={{marginVertical:15,padding:15,borderWidth:1,borderColor:'#2685EA',borderRadius:12}}>
    <Text style={{fontSize:18,fontWeight:'bold',color:'#2685EA'}}>
      🛠 PAINEL ADMINISTRATIVO
    </Text>

    <TouchableOpacity
      onPress={loadAdminUsers}
      style={{backgroundColor:'#2685EA',padding:12,borderRadius:8,marginTop:10}}
    >
      <Text style={{color:'#fff',textAlign:'center',fontWeight:'bold'}}>
        CARREGAR USUÁRIOS
      </Text>
    </TouchableOpacity>

    <TextInput
      placeholder="Buscar usuário..."
      value={adminSearch}
      onChangeText={setAdminSearch}
      style={{borderWidth:1,borderColor:'#ddd',padding:10,borderRadius:8,marginTop:10}}
    />

    {adminUsers
      .filter(u => (u.username || '').toLowerCase().includes(adminSearch.toLowerCase()))
      .map(user => (
        <View key={user.id} style={{padding:12,borderBottomWidth:1,borderColor:'#eee'}}>
          <Text style={{fontWeight:'bold'}}>@{user.username}</Text>
          <TouchableOpacity onPress={() => toggleAdminPremium(user)}>
            <Text style={{color:'#2685EA',marginTop:6}}>
              {user.is_premium ? '✓ Remover Premium' : '+ Ativar Premium'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
  </View>
)}
<TouchableOpacity
  style={s.outline}
  onPress={() => setEditing(true)}
>
          <Text style={s.bold}>EDITAR PERFIL</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.link} onPress={signOut}>
          <Text style={s.muted}>Sair da conta</Text>
        </TouchableOpacity>

        <Text style={s.sectionTitle}>Suas publicações</Text>

        {posts
          .filter(p => p.user_id === session.user.id)
          .map(p => (
            <Image
              key={p.id}
              source={{ uri: p.media_url }}
              style={s.gridImage}
            />
          ))}
      </ScrollView>
    );

  const renderMessages = () =>
    activeConversation ? (
      <View style={s.flex}>
        <View style={s.chatHeader}>
          <TouchableOpacity
            onPress={() => setActiveConversation(null)}
          >
            <Text style={s.action}>‹</Text>
          </TouchableOpacity>
          <Text style={s.bold}>
            @{activeConversation.person?.username}
          </Text>
        </View>

        <ScrollView
          style={s.flex}
          contentContainerStyle={{ padding: 15 }}
        >
          {messages.map(m => (
            <View
              key={m.id}
              style={[
                s.messageBubble,
                m.sender_id === session.user.id
                  ? s.myMessage
                  : s.theirMessage
              ]}
            >
              {m.media_type === 'audio' ? (
  <TouchableOpacity
    onPress={async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: m.media_url },
          { shouldPlay: true }
        );
      } catch (error) {
        Alert.alert('Áudio', error.message);
      }
    }}
  >
    <Text style={{
      color: m.sender_id === session.user.id ? '#fff' : '#111',
      fontSize: 16
    }}>
      ▶️ Ouvir áudio
    </Text>
  </TouchableOpacity>
) : (
  <Text style={{
    color: m.sender_id === session.user.id ? '#fff' : '#111'
  }}>
    {m.content}
  </Text>
)}
            </View>
          ))}
        </ScrollView>

        <View style={s.messageComposer}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Mensagem..."
          />
<TouchableOpacity
  onPress={recording ? stopAndSendAudio : startAudioRecording}
  style={{
    backgroundColor: recording ? '#d32f2f' : '#222',
    padding: 12,
    borderRadius: 25,
    marginRight: 8
  }}
>
  <Text style={{ color: '#fff' }}>
    {recording ? '⏹️' : '🎙️'}
  </Text>
</TouchableOpacity>
          <TouchableOpacity
            style={s.searchButton}
            onPress={sendMessage}
          >
            <Text style={s.primaryText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <View style={s.page}>
        <Text style={s.pageTitle}>Mensagens</Text>
        <Text style={s.muted}>
          Inicie uma conversa pela aba Explorar.
        </Text>

        <ScrollView>
          {people
            .filter(p => p.conversation)
            .map(p => (
              <TouchableOpacity
                key={p.id}
                style={s.personRow}
                onPress={() => openChat(p)}
              >
                {avatar(p)}
                <Text style={s.bold}>@{p.username}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>
    );

  const content =
    tab === 'Início'
      ? renderFeed()
      : tab === 'Publicar'
      ? renderPublish()
      : tab === 'Reels'
      ? renderReels()
      : tab === 'Explorar'
      ? renderSearch()
      : tab === 'Mensagens'
      ? renderMessages()
      : tab === 'Notificações'
      ? (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111' }}>
              Notificações
            </Text>
            <TouchableOpacity onPress={loadNotifications}>
              <Text style={{ color: '#555', fontSize: 13 }}>Atualizar</Text>
            </TouchableOpacity>
          </View>

          {notifications.length === 0 ? (
            <Text style={{ color: '#777' }}>
              Você ainda não tem notificações.
            </Text>
          ) : (
            notifications.map(item => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.75}
                onPress={() => markNotificationRead(item)}
                style={{
                  padding: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: '#eee',
                  backgroundColor: item.is_read ? '#fff' : '#f5f5f5',
                  borderRadius: 10,
                  marginBottom: 8
                }}
              >
                <Text style={{ color: '#111', fontSize: 15, fontWeight: item.is_read ? 'normal' : '600' }}>
                  {item.actor?.display_name || (item.actor?.username ? '@' + item.actor.username : 'Alguém')}
                  {' '}
                  {item.message || (
                    item.type === 'like'
                      ? 'curtiu sua publicação'
                      : item.type === 'comment'
                      ? 'comentou na sua publicação'
                      : item.type === 'follow'
                      ? 'começou a seguir você'
                      : 'interagiu com você'
                  )}
                </Text>
                <Text style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
                  {item.type === 'like' ? 'Curtida' : item.type === 'comment' ? 'Comentário' : item.type === 'follow' ? 'Novo seguidor' : 'Notificação'}
                  {' · '}
                  {item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : ''}
                </Text>
                {!item.is_read && (
                  <Text style={{ color: '#111', fontSize: 11, marginTop: 5 }}>
                    NOVA
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )
      : renderProfile();

  return (
    <SafeAreaView style={s.app}>
      <Header />
      {content}

      <View style={s.nav}>
        {[
          ['Início', '⌂'],
          ['Reels', '▶'],
          ['Explorar', '⌕'],
          ['Publicar', '＋'],
          ['Mensagens', '✉'],
          ['Perfil', '♙']
        ].map(([name, icon]) => (
          <TouchableOpacity
  key={name}
  style={s.navItem}
  onPress={() => {
    setTab(name);

    if (name === 'Mensagens') {
      loadConversations();
    }

    if (name === 'Explorar') {
      loadPeople();
    }

    if (name === 'Notificações') {
      loadNotifications();
    }
  }}
>
  <Text style={[s.navIcon, tab === name && s.navActive]}>
    {icon}
  </Text>

  <Text style={[s.navLabel, tab === name && s.navActive]}>
    {name}
  </Text>
</TouchableOpacity>
        ))}
      </View>

      {commentsFor && (
        <View style={s.modalShade}>
          <View style={s.commentSheet}>
            <View style={s.sheetTop}>
              <Text style={s.pageTitle}>Comentários</Text>
              <TouchableOpacity onPress={() => setCommentsFor(null)}>
                <Text style={s.bold}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {comments.map(c => (
  <View
    key={c.id}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6
    }}
  >
    <Text style={[s.commentLine, { flex: 1 }]}>
      <Text style={s.bold}>
        @{c.author?.username || 'usuario'}
      </Text>
      {' '}
      {c.content}
    </Text>

    {(c.user_id === session?.user?.id ||
      commentsFor.user_id === session?.user?.id) && (
      <TouchableOpacity
        onPress={() => deleteComment(c)}
        style={{ padding: 8 }}
      >
        <Text style={{ color: '#d32f2f' }}>Apagar</Text>
      </TouchableOpacity>
    )}
  </View>
))}
            </ScrollView>

            <View style={s.messageComposer}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Escreva um comentário..."
              />
              <TouchableOpacity
                style={s.searchButton}
                onPress={sendComment}
              >
                <Text style={s.primaryText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {selectedStory && (
        <View style={s.storyViewer}>
          <TouchableOpacity
            style={s.storyClose}
            onPress={() => setSelectedStory(null)}
          >
            <Text style={{ color: '#fff', fontSize: 22 }}>×</Text>
          </TouchableOpacity>

          <Image
            source={{ uri: selectedStory.media_url }}
            style={s.storyFull}
            resizeMode="contain"
          />

          <Text style={s.storyUser}>
            @{selectedStory.author?.username}
          </Text>
          {selectedStory.user_id === session?.user?.id && (
  <TouchableOpacity
    onPress={async () => {
      if (!window.confirm('Tem certeza que deseja apagar este Story?')) {
        return;
      }

      try {
        const { error } = await supabase
          .from('stories')
          .delete()
          .eq('id', selectedStory.id)
          .eq('user_id', session.user.id);

        if (error) throw error;

        setStories(old =>
          old.filter(story => story.id !== selectedStory.id)
        );

        setSelectedStory(null);
        window.alert('Story apagado com sucesso!');
      } catch (error) {
        window.alert('Não foi possível apagar o Story: ' + error.message);
      }
    }}
    style={{ marginTop: 12, padding: 10 }}
  >
    <Text style={{ color: '#ff4444', textAlign: 'center' }}>
      🗑 Apagar meu Story
    </Text>
  </TouchableOpacity>
)}
          {selectedStory.user_id !== session?.user?.id && (
          <>
  <TouchableOpacity
    onPress={() => openChat({
  id: selectedStory.user_id,
  username: selectedStory.author?.username,
  avatar_url: selectedStory.author?.avatar_url
})}
    style={{ marginTop: 15, padding: 12, backgroundColor: '#333', borderRadius: 20 }}
  >
    <Text style={{ color: '#fff', textAlign: 'center' }}>
      Responder no Direct
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
  onPress={async () => {
    const { error } = await supabase
      .from('story_likes')
      .insert({
        story_id: selectedStory.id,
        user_id: session.user.id
      });

    if (error) {
      Alert.alert('Curtida', error.code === '23505'
        ? 'Você já curtiu este story!'
        : error.message);
    } else {
      Alert.alert('❤️', 'Você curtiu este story!');
    }
  }}
  style={{
    marginTop: 10,
    marginBottom: 90,
    padding: 12,
    backgroundColor: '#e91e63',
    borderRadius: 20
  }}
>
  <Text style={{ color: '#fff', textAlign: 'center' }}>
    ❤️ Curtir story
  </Text>
</TouchableOpacity>
</>
)}
          {selectedStory.user_id === session?.user?.id && (
  <TouchableOpacity
  onPress={() => setShowStoryViewers(true)}
  style={{ marginTop: 10,
padding: 12, }}
>
  <Text style={{ color: '#fff', fontSize: 16 }}>
    👁 {storyViewsCount} visualizações
  </Text>
</TouchableOpacity>
)}
        </View>
      )}
      {showStoryViewers && (
  <View style={{
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 999
  }}>
    <View style={{
      backgroundColor: '#fff',
      padding: 20,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '65%'
    }}>
      <TouchableOpacity onPress={() => setShowStoryViewers(false)}>
        <Text style={{fontSize: 18, fontWeight: 'bold'}}>Fechar ✕</Text>
      </TouchableOpacity>

      <Text style={{fontSize: 20, fontWeight: 'bold', marginVertical: 15}}>
        Visualizações ({storyViewsCount})
      </Text>

      <ScrollView>
        {storyViewers.map((v, i) => (
          <View key={v.viewer_id || i} style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10
          }}>
            {avatar(v.profiles, 42)}
            <Text style={{marginLeft: 12, color: '#111'}}>
              @{v.profiles?.username || 'Usuário'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  </View>
)}

      {profileTarget && (
        <View style={s.modalShade}>
          <View style={s.commentSheet}>
            <View style={s.sheetTop}>
              <Text style={s.pageTitle}>Perfil</Text>
              <TouchableOpacity onPress={() => setProfileTarget(null)}>
                <Text style={s.bold}>Fechar</Text>
              </TouchableOpacity>
            </View>

            {avatar(profileTarget, 75)}
            <Text style={s.profileName}>
              {profileTarget.display_name}
            </Text>
            <Text style={s.muted}>
              @{profileTarget.username}
            </Text>
            <Text style={s.bio}>{profileTarget.bio}</Text>

            <TouchableOpacity
              style={s.primary}
              onPress={() => toggleFollow(profileTarget.id)}
            >
              <Text style={s.primaryText}>
                {following.includes(profileTarget.id)
                  ? 'DEIXAR DE SEGUIR'
                  : 'SEGUIR'}
              </Text>
            </TouchableOpacity>

            <ScrollView>
              {profileTarget.posts.map(p => (
                <Image
                  key={p.id}
                  source={{ uri: p.media_url }}
                  style={s.postImage}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
  }

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  auth: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#fff'
  },
  logo: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -3,
    textAlign: 'center',
    color: '#111'
  },
  tagline: {
    textAlign: 'center',
    color: '#777',
    marginTop: 5,
    marginBottom: 45
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 13,
    color: '#111',
    backgroundColor: '#fafafa'
  },
  primary: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8
  },
  primaryText: { color: '#fff', fontWeight: '800' },
  link: {
    color: '#111',
    textAlign: 'center',
    padding: 16,
    fontWeight: '700'
  },
  header: {
    height: 55,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerLogo: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#111'
  },
  headerAction: { fontSize: 24, color: '#111' },
  nav: {
  height: 62,
  marginBottom: 12,
  borderTopWidth: 1,
  borderColor: '#eee',
  flexDirection: 'row',
  justifyContent: 'space-around',
  alignItems: 'center'
},
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 22, color: '#888' },
  navLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  navActive: { color: '#111', fontWeight: '900' },
  storyStrip: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  storyItem: { alignItems: 'center', width: 72, marginHorizontal: 6 },
  storyRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: '#111',
    alignItems: 'center',
    justifyContent: 'center'
  },
  storyPlus: { fontSize: 28, color: '#111' },
  storyLabel: {
    fontSize: 10,
    color: '#555',
    marginTop: 5,
    maxWidth: 75
  },
  post: {
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  postHead: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10
  },
  avatar: {
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 20
  },
  bold: { fontWeight: '800', color: '#111' },
  muted: { color: '#777' },
  mutedSmall: { fontSize: 11, color: '#888', marginTop: 2 },
  postImage: {
    width: '100%',
    height: 360,
    backgroundColor: '#eee'
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  postActions: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 14,
    paddingTop: 10
  },
  action: { fontSize: 25, color: '#111' },
  caption: { marginHorizontal: 14, marginTop: 8, color: '#333' },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8
  },
  page: { flex: 1, padding: 18 },
  pageTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#111',
    marginBottom: 18
  },
  mediaPicker: {
    height: 260,
    backgroundColor: '#f1f1f1',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 18
  },
  plusLarge: { fontSize: 45, color: '#111' },
  preview: { width: '100%', height: '100%' },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  searchButton: {
    backgroundColor: '#111',
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  followButton: {
    borderWidth: 1,
    borderColor: '#111',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9
  },
  followText: { fontSize: 12, fontWeight: '700', color: '#111' },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginVertical: 15
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111',
    marginTop: 8
  },
  bio: { color: '#333', marginVertical: 14 },
  outline: {
    borderWidth: 1,
    borderColor: '#111',
    padding: 13,
    borderRadius: 10,
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginVertical: 18,
    color: '#111'
  },
  gridImage: { width: '100%', height: 240, marginBottom: 8 },
  avatarEdit: { alignItems: 'center', marginBottom: 20 },
  bigAvatar: { width: 100, height: 100, borderRadius: 50 },
  label: { fontWeight: '700', color: '#222', marginBottom: 7 },
  chatHeader: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  messageBubble: {
    padding: 12,
    borderRadius: 14,
    maxWidth: '82%',
    marginVertical: 5
  },
  myMessage: { backgroundColor: '#111', alignSelf: 'flex-end' },
  theirMessage: { backgroundColor: '#eee', alignSelf: 'flex-start' },
  messageComposer: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
    alignItems: 'center'
  },
  modalShade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end'
  },
  commentSheet: {
    height: '70%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16
  },
  sheetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  commentLine: { paddingVertical: 9, color: '#333' },
  storyViewer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center'
  },
  storyFull: { width: '100%', height: '90%' },
  storyClose: { position: 'absolute', top: 35, right: 20, zIndex: 2 },
  storyUser: {
    color: '#fff',
    position: 'absolute',
    top: 40,
    left: 18,
    fontWeight: '800'
  }
});
