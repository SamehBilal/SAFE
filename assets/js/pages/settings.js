import { L, T, esc, pageHead, App, $, store } from '../shell.js';
import * as live from '../live.js';

/* Who's holding this phone, and the GitHub token that lets it save. Nothing here leaves the phone. */
export default {
	title: { ar: 'الإعدادات', en: 'Settings' },
	render(s) {
		const c = live.config();
		const me = live.me();
		const steps = App.lang === 'ar'
			? ['افتحي <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">صفحة إنشاء token جديد</a> على GitHub (من حساب سامح).',
				'Repository access: <b>Only select repositories</b> واختاري <b>' + esc(c.repo || 'SAFE') + '</b>.',
				'Permissions → Repository permissions → <b>Contents: Read and write</b>.',
				'اعملي Generate، وانسخي الـ token والزقيه هنا. اعملي token لكل تليفون لوحده.']
			: ['Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">the new-token page</a> on GitHub (from Sameh’s account).',
				'Repository access: <b>Only select repositories</b>, and pick <b>' + esc(c.repo || 'SAFE') + '</b>.',
				'Permissions → Repository permissions → <b>Contents: Read and write</b>.',
				'Generate it, copy the token and paste it here. Make one token per phone.'];
		return `
		${pageHead(L('الإعدادات', 'Settings'), L('عشان تكتبوا في الدفتر والأغاني والقرعة من موبايلاتكم', 'So you can both write the journal, songs and draws from your phones'), [{ href: 'settings.html', ar: 'الإعدادات', en: 'Settings' }])}
		<section class="sec sec--top"><div class="wrap narrow">
			<form class="panel settings" id="st-form" autocomplete="off">
				<fieldset class="who">
					<legend>${L('مين ماسك الموبايل ده؟', 'Whose phone is this?')}</legend>
					<label><input type="radio" name="me" value="him"${me === 'him' ? ' checked' : ''}><span>🤵 ${T(s.him)}</span></label>
					<label><input type="radio" name="me" value="her"${me === 'her' ? ' checked' : ''}><span>👸 ${T(s.her)}</span></label>
				</fieldset>

				<h2>${L('الحفظ على GitHub', 'Saving to GitHub')}</h2>
				<p class="muted">${L('اللي بتكتبوه بيتشفّر على الموبايل بنفس مفتاح الموقع، وبعدين يتحفظ في الريبو. GitHub نفسه مايقدرش يقراه.', 'What you write is encrypted on the phone with the site’s own key, then saved to the repo. GitHub itself can’t read it.')}</p>
				<div class="f-row">
					<label class="f f--grow"><span>${L('صاحب الريبو', 'Owner')}</span><input name="owner" dir="ltr" value="${esc(c.owner)}" required></label>
					<label class="f f--grow"><span>${L('الريبو', 'Repository')}</span><input name="repo" dir="ltr" value="${esc(c.repo)}" required></label>
					<label class="f"><span>${L('الفرع', 'Branch')}</span><input name="branch" dir="ltr" value="${esc(c.branch)}" required size="8"></label>
				</div>
				<label class="f"><span>GitHub token</span><input name="token" type="password" dir="ltr" autocomplete="off" spellcheck="false" placeholder="${c.token ? '••••••••  ' + L('(محفوظ)', '(saved)') : 'github_pat_…'}"></label>
				<details class="howto"><summary>${L('أعمل token إزاي؟', 'How do I make a token?')}</summary><ol>${steps.map((x) => `<li>${x}</li>`).join('')}</ol></details>
				<p class="form-msg" id="st-msg" role="status"></p>
				<div class="f-actions">
					${c.token ? `<button type="button" class="btn btn--ghost" id="st-forget">${L('امسحي الـ token', 'Forget the token')}</button>` : ''}
					<button type="button" class="btn btn--ghost" id="st-test">${L('جربي الاتصال', 'Test connection')}</button>
					<button type="submit" class="btn btn--coral">${L('احفظي', 'Save')}</button>
				</div>
			</form>
			<p class="muted center" style="margin-top:20px">${L('الـ token بيفضل على الموبايل ده بس. لو الموبايل ضاع، امسحيه من GitHub.', 'The token stays on this phone only. If the phone is lost, delete it on GitHub.')}</p>
		</div></section>`;
	},
	after(main) {
		const form = $('#st-form', main);
		const msg = $('#st-msg', main);
		const keep = () => {
			const c = live.config();
			live.setConfig({ owner: form.owner.value.trim(), repo: form.repo.value.trim(), branch: form.branch.value.trim() || 'main', token: form.token.value.trim() || c.token });
			if (form.me.value) live.setMe(form.me.value);
		};
		form.onsubmit = async (e) => {
			e.preventDefault();
			keep();
			msg.textContent = L('اتحفظ ✓', 'Saved ✓');
			form.token.value = '';
			form.token.placeholder = '••••••••  ' + L('(محفوظ)', '(saved)');
		};
		$('#st-test', main).onclick = async () => {
			keep();
			msg.textContent = L('بنجرب…', 'Testing…');
			try {
				const r = await live.check();
				msg.textContent = r.push
					? L('تمام! الموبايل ده يقدر يحفظ ♥', 'All good! This phone can save ♥')
					: L('شايف الريبو بس الـ token مالوش صلاحية كتابة (Contents: Read and write)', 'I can see the repo, but the token can’t write (Contents: Read and write)');
				if (!live.me()) msg.textContent += ' — ' + L('اختاري انتي مين فوق', 'choose whose phone this is above');
			} catch (err) {
				msg.textContent = err.code === 'repo' ? L('مش لاقي الريبو — راجعي الاسم', 'Repo not found — check the names') : live.why(err);
			}
		};
		$('#st-forget', main)?.addEventListener('click', () => {
			const c = live.config();
			live.setConfig({ ...c, token: '' });
			for (const k of ['journal', 'music', 'draw']) store.del('us.live.' + k);
			location.reload();
		});
	}
};
