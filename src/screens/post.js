/* หน้าโพสต์ */
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { PASTEL } from '../theme';
import { TYPE_COLOR, TYPE_LABEL } from '../constants';
import { byOldest, relTime } from '../utils';
import { useApp } from '../context';
import { Avatar, Breadcrumb, Card, Empty, Pill } from '../components/ui';
import { AttachmentList, CommentBox, ContentActions, LikeBtn } from '../components/content';

export function PostScreen({ postId }) {
  const { s, data, addComment, push, back, nameOf, viewPost } = useApp();
  useEffect(() => { viewPost(postId); }, [postId]);
  const p = data.posts.find((x) => x.id === postId);
  if (!p) return <Empty text="ไม่พบเนื้อหานี้" />;
  const course = data.courses.find((c) => c.id === p.courseId);
  const mode = p.type === 'project' ? 'project' : 'summary';
  const comments = [...(p.comments || [])].sort(byOldest);
  const color = TYPE_COLOR[p.type];
  return (
    <View>
      <Breadcrumb items={[
        { label: 'หน้าแรก', go: 'home' },
        { label: course ? course.code : 'รายวิชา', go: 'contributors', params: { courseId: p.courseId, mode } },
        { label: p.title },
      ]} />
      <View style={[s.hero, { backgroundColor: PASTEL[color].tile }]}>
        <View style={[s.blob, { backgroundColor: PASTEL[color].dot, right: -40, top: -50 }]} />
        <View style={s.rowBetween}>
          <Pill label={TYPE_LABEL[p.type]} />
          <Text style={s.heroMeta}>{relTime(p.createdAt)}</Text>
        </View>
        <Text style={s.heroTitle}>{p.title}</Text>
        <View style={[s.row, { marginTop: 10, flexWrap: 'wrap' }]}>
          <Text style={s.heroMeta}>📘 {course ? course.code : ''}   📅 เทอม {p.semester || '-'}</Text>
        </View>
      </View>

      <Card style={[s.authorRow]} onPress={() => push('profile', { sid: p.authorId })}>
        <Avatar sid={p.authorId} name={p.authorName} size={40} showEmoji />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.personName}>{nameOf(p.authorId, p.authorName)}</Text>
          <Text style={s.meta}>แตะเพื่อดูโปรไฟล์</Text>
        </View>
        <LikeBtn post={p} withLabel />
      </Card>

      <Card style={{ padding: 20 }}>
        {p.content ? <Text style={s.detailContent}>{p.content}</Text> : null}
        <AttachmentList items={p.attachments} flush={!p.content} />
      </Card>
      <ContentActions item={p} onDeleted={back} />

      <CommentBox
        title="ความคิดเห็น"
        items={comments}
        postId={p.id}
        emptyText="ยังไม่มีความคิดเห็น"
        placeholder="แสดงความคิดเห็น หรือถามเพิ่มเติม..."
        onSubmit={(t) => addComment(p.id, t)}
      />
    </View>
  );
}
